import { db } from "../../db/index.ts";
import { transactions } from "../../db/schema.ts";
import { sql, and, eq, gte, inArray, or } from "drizzle-orm";
import { timeQuery } from "../timing.ts";

export interface ChartPeriodBucket {
  periodKey: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
  isCurrent: boolean;
}

export type ChartWindow = "7d" | "6m" | "12m";

/**
 * Pure helper to generate continuous period slots.
 * Fully unit-testable without database dependencies.
 */
export function generateEmptyBuckets(
  window: ChartWindow,
  referenceDate = new Date()
): ChartPeriodBucket[] {
  const buckets: ChartPeriodBucket[] = [];
  const ref = new Date(referenceDate);

  if (window === "7d") {
    // 7 days ending today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref);
      d.setDate(ref.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const periodKey = `${year}-${month}-${day}`;
      const label = d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
      });
      const isCurrent = i === 0;
      buckets.push({
        periodKey,
        label,
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        isCurrent,
      });
    }
  } else {
    const monthCount = window === "12m" ? 12 : 6;
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const periodKey = `${year}-${month}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const isCurrent = i === 0;
      buckets.push({
        periodKey,
        label,
        incomeMinor: 0,
        expenseMinor: 0,
        netMinor: 0,
        isCurrent,
      });
    }
  }

  return buckets;
}

export function mergeBucketsWithAggregates(
  buckets: ChartPeriodBucket[],
  aggregates: Array<{
    periodKey: string;
    incomeMinor: number;
    expenseMinor: number;
  }>
): ChartPeriodBucket[] {
  const map = new Map(
    aggregates.map((a) => [
      a.periodKey,
      { income: a.incomeMinor, expense: a.expenseMinor },
    ])
  );

  return buckets.map((b) => {
    const agg = map.get(b.periodKey) || { income: 0, expense: 0 };
    return {
      ...b,
      incomeMinor: agg.income,
      expenseMinor: agg.expense,
      netMinor: agg.income - agg.expense,
    };
  });
}

/**
 * Single SQL aggregation query scoped by userId, excluding transfers,
 * and respecting optional wallet filter.
 */
export async function getDashboardChartData(
  userId: string,
  options?: {
    window?: ChartWindow;
    walletId?: string;
  }
): Promise<ChartPeriodBucket[]> {
  const window = options?.window || "6m";
  const walletId = options?.walletId && options.walletId !== "all" ? options.walletId : null;

  return timeQuery(`getDashboardChartData:${window}`, async () => {
    const now = new Date();
    let startDate: Date;
    let formatStr: string;

    if (window === "7d") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      formatStr = "YYYY-MM-DD";
    } else {
      const months = window === "12m" ? 12 : 6;
      startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1, 0, 0, 0, 0);
      formatStr = "YYYY-MM";
    }

    const conditions = [
      eq(transactions.userId, userId),
      inArray(transactions.type, ["income", "expense"]),
      gte(transactions.occurredAt, startDate),
    ];

    if (walletId) {
      conditions.push(
        or(
          eq(transactions.walletId, walletId),
          eq(transactions.toWalletId, walletId)
        )!
      );
    }

    // Execute single SQL aggregation query
    const results = await db
      .select({
        periodKey: sql<string>`to_char(${transactions.occurredAt}, ${formatStr})`.as("period_key"),
        incomeMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else 0 end), 0)::int`.as("income_minor"),
        expenseMinor: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)::int`.as("expense_minor"),
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(sql`to_char(${transactions.occurredAt}, ${formatStr})`);

    const emptyBuckets = generateEmptyBuckets(window, now);
    return mergeBucketsWithAggregates(emptyBuckets, results);
  });
}

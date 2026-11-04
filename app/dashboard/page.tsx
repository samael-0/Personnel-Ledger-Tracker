import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { db } from "@/db";
import { transactions, categories, wallets, users } from "@/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/data/defaults";
import { getAccountsWithBalances } from "@/lib/data/accounts";
import { getDashboardChartData, type ChartPeriodBucket } from "@/lib/data/chart-data";
import { timeQuery } from "@/lib/timing";

export default async function DashboardPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userCategories: any[] = DEFAULT_CATEGORIES;
  let userWallets: any[] = [];
  let userTransactions: any[] = [];
  let initialChartData: ChartPeriodBucket[] = [];

  try {
    const [userRows, fetchedCats, accountsData, fetchedTxs, chartData] =
      await timeQuery("DashboardPage:parallel-load", () =>
        Promise.all([
          db
            .select({ currency: users.currency })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1),
          db
            .select()
            .from(categories)
            .where(
              or(
                eq(categories.userId, session.user.id),
                isNull(categories.userId)
              )
            ),
          getAccountsWithBalances(session.user.id, false),
          db
            .select({
              id: transactions.id,
              userId: transactions.userId,
              type: transactions.type,
              amountMinor: transactions.amountMinor,
              currency: transactions.currency,
              categoryId: transactions.categoryId,
              categoryName: categories.name,
              walletId: transactions.walletId,
              walletName: wallets.name,
              merchant: transactions.merchant,
              note: transactions.note,
              occurredAt: transactions.occurredAt,
              source: transactions.source,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(wallets, eq(transactions.walletId, wallets.id))
            .where(eq(transactions.userId, session.user.id))
            .orderBy(desc(transactions.occurredAt))
            .limit(50),
          getDashboardChartData(session.user.id, {
            window: "6m",
            walletId: "all",
          }),
        ])
      );

    if (userRows.length > 0 && userRows[0].currency) {
      userCurrency = userRows[0].currency;
    }

    if (fetchedCats.length > 0) {
      userCategories = fetchedCats;
    }

    if (accountsData.accounts.length > 0) {
      userWallets = accountsData.accounts;
    } else {
      userWallets = DEFAULT_WALLETS.map((w, i) => ({
        id: `wal-default-${i}`,
        name: w.name,
        type: w.type,
        currency: userCurrency,
        isDefault: i === 0,
        isArchived: false,
        currentBalanceMinor: 0,
      }));
    }

    userTransactions = fetchedTxs;
    initialChartData = chartData;
  } catch (e) {
    console.warn("DB query skipped/fallback in dashboard:", e);
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        currency: userCurrency,
        image: session.user.image,
      }}
    >
      <DashboardView
        user={{
          name: session.user.name,
          currency: userCurrency,
        }}
        transactions={userTransactions}
        categories={userCategories}
        wallets={userWallets}
        initialChartData={initialChartData}
      />
    </AppShell>
  );
}

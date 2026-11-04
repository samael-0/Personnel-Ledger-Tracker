import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { transactions, categories, wallets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const txs = await db
      .select({
        id: transactions.id,
        occurredAt: transactions.occurredAt,
        type: transactions.type,
        amountMinor: transactions.amountMinor,
        currency: transactions.currency,
        merchant: transactions.merchant,
        categoryName: categories.name,
        walletName: wallets.name,
        source: transactions.source,
        note: transactions.note,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .where(eq(transactions.userId, session.user.id))
      .orderBy(desc(transactions.occurredAt));

    const headers = [
      "ID",
      "Date",
      "Type",
      "Merchant",
      "Amount Minor",
      "Amount Decimal",
      "Currency",
      "Category",
      "Wallet",
      "Source",
      "Note",
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const escaped = str.toString().replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const rows = txs.map((tx) => [
      escapeCsv(tx.id),
      escapeCsv(new Date(tx.occurredAt).toISOString()),
      escapeCsv(tx.type),
      escapeCsv(tx.merchant),
      escapeCsv(tx.amountMinor.toString()),
      escapeCsv((tx.amountMinor / 100).toFixed(2)),
      escapeCsv(tx.currency),
      escapeCsv(tx.categoryName || "Uncategorized"),
      escapeCsv(tx.walletName || "Default"),
      escapeCsv(tx.source),
      escapeCsv(tx.note || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\r\n"
    );

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="ledgerly-export-${Date.now()}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


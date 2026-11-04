import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/db";
import { transactions, categories, wallets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const toWallets = alias(wallets, "to_wallets");

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
        toAmountMinor: transactions.toAmountMinor,
        transferFeeMinor: transactions.transferFeeMinor,
        merchant: transactions.merchant,
        categoryName: categories.name,
        fromAccountName: wallets.name,
        toAccountName: toWallets.name,
        source: transactions.source,
        note: transactions.note,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .leftJoin(toWallets, eq(transactions.toWalletId, toWallets.id))
      .where(eq(transactions.userId, session.user.id))
      .orderBy(desc(transactions.occurredAt));

    const headers = [
      "ID",
      "Date",
      "Type",
      "Merchant / Description",
      "Amount Minor",
      "Amount Decimal",
      "Currency",
      "Category",
      "Source Account",
      "Destination Account",
      "Destination Amount Decimal",
      "Transfer Fee",
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
      escapeCsv(
        tx.type === "transfer" ? "Transfer" : tx.categoryName || "Uncategorized"
      ),
      escapeCsv(tx.fromAccountName || "Default Account"),
      escapeCsv(tx.type === "transfer" ? tx.toAccountName || "N/A" : ""),
      escapeCsv(
        tx.toAmountMinor !== null && tx.toAmountMinor !== undefined
          ? (tx.toAmountMinor / 100).toFixed(2)
          : ""
      ),
      escapeCsv(
        tx.transferFeeMinor
          ? (tx.transferFeeMinor / 100).toFixed(2)
          : "0.00"
      ),
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

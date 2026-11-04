import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { TransactionsPageWrapper } from "@/components/transactions/TransactionsPageWrapper";
import { db } from "@/db";
import { transactions, categories, wallets, users, userHiddenCategories } from "@/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/data/defaults";
import { timeQuery } from "@/lib/timing";

export default async function TransactionsPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userCategories: Array<{ id: string; name: string; kind: "income" | "expense" }> = DEFAULT_CATEGORIES;
  let userWallets: Array<{ id: string; name: string; type: string; currency: string }> = [];
  let userTransactions: any[] = [];

  try {
    const toWallets = alias(wallets, "to_wallets");

    const [userRows, hidden, fetchedCats, fetchedWallets, fetchedTxs] = await timeQuery(
      "TransactionsPage:parallel-load",
      () =>
        Promise.all([
          db
            .select({ currency: users.currency })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1),
          db
            .select({ categoryId: userHiddenCategories.categoryId })
            .from(userHiddenCategories)
            .where(eq(userHiddenCategories.userId, session.user.id)),
          db
            .select()
            .from(categories)
            .where(
              or(eq(categories.userId, session.user.id), isNull(categories.userId))
            ),
          db
            .select()
            .from(wallets)
            .where(eq(wallets.userId, session.user.id))
            .orderBy(wallets.sortOrder, wallets.createdAt),
          db
            .select({
              id: transactions.id,
              userId: transactions.userId,
              type: transactions.type,
              amountMinor: transactions.amountMinor,
              currency: transactions.currency,
              categoryId: transactions.categoryId,
              categoryName: categories.name,
              categoryIcon: categories.icon,
              walletId: transactions.walletId,
              walletName: wallets.name,
              toWalletId: transactions.toWalletId,
              toWalletName: toWallets.name,
              toAmountMinor: transactions.toAmountMinor,
              transferFeeMinor: transactions.transferFeeMinor,
              merchant: transactions.merchant,
              note: transactions.note,
              occurredAt: transactions.occurredAt,
              source: transactions.source,
              receiptId: transactions.receiptId,
              createdAt: transactions.createdAt,
            })
            .from(transactions)
            .leftJoin(categories, eq(transactions.categoryId, categories.id))
            .leftJoin(wallets, eq(transactions.walletId, wallets.id))
            .leftJoin(toWallets, eq(transactions.toWalletId, toWallets.id))
            .where(eq(transactions.userId, session.user.id))
            .orderBy(desc(transactions.occurredAt))
            .limit(100),
        ])
    );

    if (userRows.length > 0 && userRows[0].currency) {
      userCurrency = userRows[0].currency;
    }

    const hiddenSet = new Set(hidden.map((h) => h.categoryId));

    if (fetchedCats.length > 0) {
      userCategories = fetchedCats
        .filter((c) => !hiddenSet.has(c.id))
        .map((c) => ({
          id: c.id,
          name: c.name,
          kind: c.kind as "income" | "expense",
          icon: c.icon,
          isArchived: c.isArchived,
        }));
    }

    if (fetchedWallets.length > 0) {
      userWallets = fetchedWallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        currency: w.currency,
        isDefault: w.isDefault,
        isArchived: w.isArchived,
      }));
    } else {
      userWallets = DEFAULT_WALLETS.map((w, i) => ({
        id: `wal-default-${i}`,
        name: w.name,
        type: w.type,
        currency: userCurrency,
        isDefault: i === 0,
        isArchived: false,
      }));
    }

    userTransactions = fetchedTxs;
  } catch (err) {
    console.error("Transactions page load error:", err);
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
      <TransactionsPageWrapper
        initialTransactions={userTransactions}
        categories={userCategories}
        wallets={userWallets}
        userCurrency={userCurrency}
      />
    </AppShell>
  );
}

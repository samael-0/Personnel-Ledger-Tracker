import { requireAuth } from "@/lib/session";
import { AppShell } from "@/components/AppShell";
import { TransactionsPageWrapper } from "@/components/transactions/TransactionsPageWrapper";
import { db } from "@/db";
import { transactions, categories, wallets, users } from "@/db/schema";
import { eq, desc, or, isNull } from "drizzle-orm";
import { DEFAULT_CATEGORIES, DEFAULT_WALLETS } from "@/lib/data/defaults";

export default async function TransactionsPage() {
  const session = await requireAuth();

  let userCurrency = "USD";
  let userCategories: Array<{ id: string; name: string; kind: "income" | "expense" }> = DEFAULT_CATEGORIES;
  let userWallets: Array<{ id: string; name: string; type: string; currency: string }> = [];
  let userTransactions: any[] = [];

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (user.length > 0 && user[0].currency) {
      userCurrency = user[0].currency;
    }

    const fetchedCats = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, session.user.id), isNull(categories.userId)));

    if (fetchedCats.length > 0) {
      userCategories = fetchedCats.map((c) => ({
        id: c.id,
        name: c.name,
        kind: c.kind as "income" | "expense",
      }));
    }

    const fetchedWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, session.user.id));

    if (fetchedWallets.length > 0) {
      userWallets = fetchedWallets.map((w) => ({
        id: w.id,
        name: w.name,
        type: w.type,
        currency: w.currency,
      }));
    } else {
      userWallets = DEFAULT_WALLETS.map((w, i) => ({
        id: `wal-default-${i}`,
        name: w.name,
        type: w.type,
        currency: userCurrency,
      }));
    }

    userTransactions = await db
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
        receiptId: transactions.receiptId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(wallets, eq(transactions.walletId, wallets.id))
      .where(eq(transactions.userId, session.user.id))
      .orderBy(desc(transactions.occurredAt))
      .limit(100);
  } catch (e) {
    console.warn("Could not query DB during transactions render, falling back:", e);
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


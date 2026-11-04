import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";

export interface AccountWithBalance {
  id: string;
  userId: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceMinor: number;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  accountNumberLast4: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  currentBalanceMinor: number;
}

export async function getAccountsWithBalances(
  userId: string,
  includeArchived = false
): Promise<{
  accounts: AccountWithBalance[];
  totalsByCurrency: Record<string, number>;
  firstRun: boolean;
}> {
  const conditions = [eq(wallets.userId, userId)];
  if (!includeArchived) {
    conditions.push(eq(wallets.isArchived, false));
  }

  const userWallets = await db
    .select()
    .from(wallets)
    .where(and(...conditions))
    .orderBy(asc(wallets.sortOrder), asc(wallets.createdAt));

  // Check if user has no accounts at all
  if (userWallets.length === 0 && !includeArchived) {
    const anyAccount = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (anyAccount.length === 0) {
      return {
        accounts: [],
        totalsByCurrency: {},
        firstRun: true,
      };
    }
  }

  // Fetch transactions to compute balance on the fly
  const userTxs = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amountMinor: transactions.amountMinor,
      currency: transactions.currency,
      walletId: transactions.walletId,
      toWalletId: transactions.toWalletId,
      toAmountMinor: transactions.toAmountMinor,
      transferFeeMinor: transactions.transferFeeMinor,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  const accounts: AccountWithBalance[] = userWallets.map((w) => {
    let balance = w.openingBalanceMinor;

    for (const tx of userTxs) {
      if (tx.type === "income" && tx.walletId === w.id) {
        balance += tx.amountMinor;
      } else if (tx.type === "expense" && tx.walletId === w.id) {
        balance -= tx.amountMinor;
      } else if (tx.type === "transfer") {
        if (tx.walletId === w.id) {
          balance -= tx.amountMinor + (tx.transferFeeMinor || 0);
        }
        if (tx.toWalletId === w.id) {
          balance += tx.toAmountMinor ?? tx.amountMinor;
        }
      }
    }

    return {
      ...w,
      currentBalanceMinor: balance,
    };
  });

  const totalsByCurrency: Record<string, number> = {};
  for (const acc of accounts) {
    if (!acc.isArchived) {
      const cur = acc.currency || "USD";
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + acc.currentBalanceMinor;
    }
  }

  return {
    accounts,
    totalsByCurrency,
    firstRun: false,
  };
}


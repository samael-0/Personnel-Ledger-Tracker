import { db } from "../../db/index.ts";
import { wallets, transactions } from "../../db/schema.ts";
import { eq, asc, and } from "drizzle-orm";
import { timeQuery } from "../timing.ts";

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

export interface MinimalWallet {
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
}

export interface MinimalTransaction {
  id: string;
  type: string;
  amountMinor: number;
  currency: string;
  walletId: string;
  toWalletId?: string | null;
  toAmountMinor?: number | null;
  transferFeeMinor?: number | null;
}

/**
 * Pure function: calculates balance for each account based on opening balance and transactions.
 * Fully unit-testable without database dependencies.
 */
export function calculateAccountBalances(
  walletList: MinimalWallet[],
  txList: MinimalTransaction[]
): {
  accounts: AccountWithBalance[];
  totalsByCurrency: Record<string, number>;
} {
  const accounts: AccountWithBalance[] = walletList.map((w) => {
    let balance = w.openingBalanceMinor;

    for (const tx of txList) {
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
      totalsByCurrency[cur] =
        (totalsByCurrency[cur] || 0) + acc.currentBalanceMinor;
    }
  }

  return { accounts, totalsByCurrency };
}

export async function getAccountsWithBalances(
  userId: string,
  includeArchived = false
): Promise<{
  accounts: AccountWithBalance[];
  totalsByCurrency: Record<string, number>;
  firstRun: boolean;
}> {
  return timeQuery("getAccountsWithBalances", async () => {
    const conditions = [eq(wallets.userId, userId)];
    if (!includeArchived) {
      conditions.push(eq(wallets.isArchived, false));
    }

    // Run wallet fetch and transaction fetch in parallel
    const [userWallets, userTxs] = await Promise.all([
      db
        .select()
        .from(wallets)
        .where(and(...conditions))
        .orderBy(asc(wallets.sortOrder), asc(wallets.createdAt)),
      db
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
        .where(eq(transactions.userId, userId)),
    ]);

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

    const { accounts, totalsByCurrency } = calculateAccountBalances(
      userWallets,
      userTxs
    );

    return {
      accounts,
      totalsByCurrency,
      firstRun: false,
    };
  });
}

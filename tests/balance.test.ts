import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateAccountBalances, type MinimalWallet, type MinimalTransaction } from "../lib/data/accounts.ts";

describe("Account Balance Calculation", () => {
  const baseWallet = (id: string, opening: number, currency = "USD"): MinimalWallet => ({
    id,
    userId: "user-1",
    name: `Account ${id}`,
    type: "bank",
    currency,
    openingBalanceMinor: opening,
    isDefault: false,
    isArchived: false,
    sortOrder: 0,
    accountNumberLast4: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("returns opening balances when no transactions exist", () => {
    const wallets = [baseWallet("w1", 10000), baseWallet("w2", 5000)];
    const result = calculateAccountBalances(wallets, []);

    assert.equal(result.accounts[0].currentBalanceMinor, 10000);
    assert.equal(result.accounts[1].currentBalanceMinor, 5000);
    assert.equal(result.totalsByCurrency["USD"], 15000);
  });

  it("adds income and deducts expenses for the correct wallet", () => {
    const wallets = [baseWallet("w1", 10000), baseWallet("w2", 5000)];
    const txs: MinimalTransaction[] = [
      { id: "t1", type: "income", amountMinor: 5000, currency: "USD", walletId: "w1" },
      { id: "t2", type: "expense", amountMinor: 2000, currency: "USD", walletId: "w1" },
      { id: "t3", type: "expense", amountMinor: 1000, currency: "USD", walletId: "w2" },
    ];

    const result = calculateAccountBalances(wallets, txs);

    assert.equal(result.accounts[0].currentBalanceMinor, 13000); // 10000 + 5000 - 2000
    assert.equal(result.accounts[1].currentBalanceMinor, 4000);  // 5000 - 1000
    assert.equal(result.totalsByCurrency["USD"], 17000);
  });

  it("handles transfers including transfer fees and cross-account destination amounts", () => {
    const wallets = [baseWallet("w1", 10000), baseWallet("w2", 5000)];
    const txs: MinimalTransaction[] = [
      {
        id: "t1",
        type: "transfer",
        amountMinor: 3000,
        transferFeeMinor: 100, // fee deducted from source
        toAmountMinor: 3000,
        currency: "USD",
        walletId: "w1",
        toWalletId: "w2",
      },
    ];

    const result = calculateAccountBalances(wallets, txs);

    // Source loses amount + fee: 10000 - 3000 - 100 = 6900
    assert.equal(result.accounts[0].currentBalanceMinor, 6900);
    // Destination gains amount: 5000 + 3000 = 8000
    assert.equal(result.accounts[1].currentBalanceMinor, 8000);
    // Total drops by the fee amount (100)
    assert.equal(result.totalsByCurrency["USD"], 14900);
  });

  it("groups totals strictly by currency without mixing", () => {
    const wallets = [
      baseWallet("w1", 10000, "USD"),
      baseWallet("w2", 8000, "EUR"),
    ];
    const txs: MinimalTransaction[] = [
      { id: "t1", type: "income", amountMinor: 2000, currency: "USD", walletId: "w1" },
      { id: "t2", type: "expense", amountMinor: 1000, currency: "EUR", walletId: "w2" },
    ];

    const result = calculateAccountBalances(wallets, txs);

    assert.equal(result.totalsByCurrency["USD"], 12000);
    assert.equal(result.totalsByCurrency["EUR"], 7000);
    assert.equal(Object.keys(result.totalsByCurrency).length, 2);
  });

  it("excludes archived accounts from totalsByCurrency", () => {
    const w1 = baseWallet("w1", 10000, "USD");
    const w2 = baseWallet("w2", 5000, "USD");
    w2.isArchived = true;

    const result = calculateAccountBalances([w1, w2], []);

    assert.equal(result.accounts[0].currentBalanceMinor, 10000);
    assert.equal(result.accounts[1].currentBalanceMinor, 5000);
    assert.equal(result.totalsByCurrency["USD"], 10000); // w2 excluded from totals
  });
});


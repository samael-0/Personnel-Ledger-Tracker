"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  TransactionSheet,
  type Category,
  type Wallet,
  type TransactionItem,
} from "@/components/transactions/TransactionSheet";
import { formatMoney } from "@/lib/money";

interface DashboardViewProps {
  user: {
    name: string;
    currency: string;
  };
  transactions: Array<{
    id: string;
    type: "income" | "expense" | "transfer";
    amountMinor: number;
    currency: string;
    categoryId?: string | null;
    categoryName?: string | null;
    categoryIcon?: string | null;
    walletId: string;
    walletName?: string | null;
    toWalletId?: string | null;
    toWalletName?: string | null;
    toAmountMinor?: number | null;
    transferFeeMinor?: number | null;
    merchant: string;
    note?: string | null;
    occurredAt: string | Date;
    source: "manual" | "receipt";
  }>;
  categories: Category[];
  wallets: Wallet[];
}

export function DashboardView({
  user,
  transactions: initialTxs,
  categories,
  wallets: initialWallets,
}: DashboardViewProps) {
  const [txs, setTxs] = React.useState(initialTxs);
  const [wallets, setWallets] = React.useState<Wallet[]>(initialWallets);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedTx, setSelectedTx] = React.useState<TransactionItem | null>(null);
  const [isBalanceHidden, setIsBalanceHidden] = React.useState(false);
  const [selectedAccountFilter, setSelectedAccountFilter] = React.useState<string>("all");

  const refreshData = React.useCallback(async () => {
    try {
      const [txsRes, walletsRes] = await Promise.all([
        fetch("/api/transactions?limit=50"),
        fetch("/api/wallets"),
      ]);

      if (txsRes.ok) {
        const data = await txsRes.json();
        setTxs(data.transactions || []);
      }
      if (walletsRes.ok) {
        const wData = await walletsRes.json();
        setWallets(wData.wallets || []);
      }
    } catch (e) {
      console.error("Refresh failed", e);
    }
  }, []);

  // Compute Current Month Stats (excluding transfers from income/expense)
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const monthTxs = txs.filter((t) => {
    const d = new Date(t.occurredAt);
    if (isNaN(d.getTime())) return false;
    const matchesMonth = d.toISOString().startsWith(currentMonthYear);
    const matchesAccount =
      selectedAccountFilter === "all" ||
      t.walletId === selectedAccountFilter ||
      t.toWalletId === selectedAccountFilter;
    return matchesMonth && matchesAccount;
  });

  const monthIncomeMinor = monthTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amountMinor, 0);

  const monthExpenseMinor = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amountMinor, 0);

  // Group accounts totals by currency strictly
  const totalsByCurrency: Record<string, number> = {};
  for (const w of wallets) {
    if (!w.isArchived) {
      const cur = w.currency || user.currency;
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + (w.currentBalanceMinor ?? 0);
    }
  }

  const primaryBalanceMinor = totalsByCurrency[user.currency] ?? (monthIncomeMinor - monthExpenseMinor);

  return (
    <div className="space-y-6">
      {/* 1. HERO TOTAL BALANCE ACROSS ACCOUNTS (Grouped by currency) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-muted block">
            Net Liquid Portfolio
          </span>
          {Object.keys(totalsByCurrency).length > 1 && (
            <span className="text-[10px] font-extrabold bg-neo-yellow/30 border border-border px-2 py-0.5 rounded-pill text-ink">
              Multi-Currency
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight font-mono">
            {isBalanceHidden
              ? "••••••••"
              : `${primaryBalanceMinor < 0 ? "-" : ""}${formatMoney(
                  Math.abs(primaryBalanceMinor),
                  user.currency
                )}`}
          </span>
          <button
            type="button"
            onClick={() => setIsBalanceHidden(!isBalanceHidden)}
            aria-label="Toggle balance visibility"
            className="w-9 h-9 rounded-btn bg-surface-subtle border-2 border-border shadow-neo-sm flex items-center justify-center text-ink hover:bg-surface active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          >
            {isBalanceHidden ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Currency totals row if multiple currencies exist */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {Object.entries(totalsByCurrency).map(([cur, totalMinor]) => (
            <span
              key={cur}
              className="text-xs font-mono font-bold bg-surface border-2 border-border px-2.5 py-0.5 rounded-pill shadow-neo-sm text-ink"
            >
              {cur}: {totalMinor < 0 ? "-" : ""}
              {formatMoney(Math.abs(totalMinor), cur)}
            </span>
          ))}
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-pill flex items-center gap-1">
            <span>▲</span>
            <span>+{formatMoney(monthIncomeMinor, user.currency)} Inflow</span>
          </span>
        </div>
      </div>

      {/* 2. FOUR COLORFUL NEO-BRUTALIST ACTION TILES */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {/* Income */}
        <button
          type="button"
          onClick={() => {
            setSelectedTx(null);
            setIsSheetOpen(true);
          }}
          className="bg-neo-cyan border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">Income</span>
        </button>

        {/* Expense */}
        <button
          type="button"
          onClick={() => {
            setSelectedTx(null);
            setIsSheetOpen(true);
          }}
          className="bg-neo-purple border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">Expense</span>
        </button>

        {/* Transfer */}
        <button
          type="button"
          onClick={() => {
            setSelectedTx({
              type: "transfer",
              amountMinor: 0,
              currency: user.currency,
              walletId: wallets[0]?.id || "",
              toWalletId: wallets[1]?.id || "",
              merchant: "Account Transfer",
              occurredAt: new Date().toISOString(),
            });
            setIsSheetOpen(true);
          }}
          className="bg-neo-yellow border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">Transfer</span>
        </button>

        {/* Scan AI */}
        <Link
          href="/scan"
          className="bg-neo-coral border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">Scan AI</span>
        </Link>
      </div>

      {/* 3. PER-ACCOUNT BALANCES CAROUSEL / ROW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-ink">Accounts & Balances</span>
          <Link
            href="/accounts"
            className="text-xs font-extrabold text-accent hover:underline"
          >
            Manage Accounts →
          </Link>
        </div>

        {wallets.length === 0 ? (
          <div className="p-4 rounded-card border-2 border-border bg-surface shadow-neo-sm text-center">
            <p className="text-xs text-muted font-bold">No accounts configured yet.</p>
            <Link href="/accounts" className="inline-block mt-2">
              <Button variant="primary" size="sm">+ Create First Account</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {wallets.filter((w) => !w.isArchived).map((w) => (
              <div
                key={w.id}
                onClick={() => {
                  setSelectedAccountFilter(
                    selectedAccountFilter === w.id ? "all" : w.id
                  );
                }}
                className={`p-4 rounded-card border-2 border-border cursor-pointer transition-all ${
                  selectedAccountFilter === w.id
                    ? "bg-neo-yellow/30 shadow-neo border-ink"
                    : "bg-surface shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-ink truncate">
                    {w.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {w.isDefault && (
                      <span className="text-[10px] font-extrabold bg-neo-yellow text-ink border border-border px-1.5 py-0.2 rounded-pill">
                        ★ Default
                      </span>
                    )}
                    <span className="text-[10px] font-bold text-muted bg-surface-subtle border border-border px-1.5 py-0.2 rounded-pill capitalize">
                      {w.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-black font-mono font-tabular text-ink">
                    {isBalanceHidden
                      ? "••••••"
                      : `${(w.currentBalanceMinor ?? 0) < 0 ? "-" : ""}${formatMoney(
                          Math.abs(w.currentBalanceMinor ?? 0),
                          w.currency
                        )}`}
                  </span>
                  {selectedAccountFilter === w.id && (
                    <span className="text-[10px] font-extrabold text-accent">
                      ● Active Filter
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. PERFORMANCE AREA CHART WITH MONTH TOTALS & FILTER */}
      <div className="bg-surface rounded-card border-2 border-border shadow-neo p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
          <div>
            <span className="text-xs font-black text-ink block">
              Monthly Inflow & Expense
            </span>
            <span className="text-[11px] font-bold text-muted">
              {selectedAccountFilter === "all"
                ? "Across all active accounts"
                : `Filtered by: ${wallets.find((w) => w.id === selectedAccountFilter)?.name || "Account"}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-muted">Filter:</span>
            <select
              value={selectedAccountFilter}
              onChange={(e) => setSelectedAccountFilter(e.target.value)}
              className="text-xs font-bold bg-surface-subtle border-2 border-border rounded-control px-2.5 py-1 text-ink shadow-neo-sm"
            >
              <option value="all">All Accounts</option>
              {wallets.filter((w) => !w.isArchived).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Figures block */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-btn bg-emerald-50 dark:bg-emerald-950/40 border-2 border-border">
            <span className="text-[10px] font-extrabold text-muted uppercase block">
              Month Income
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
              +{formatMoney(monthIncomeMinor, user.currency)}
            </span>
          </div>

          <div className="p-3 rounded-btn bg-rose-50 dark:bg-rose-950/40 border-2 border-border">
            <span className="text-[10px] font-extrabold text-muted uppercase block">
              Month Expense
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400">
              -{formatMoney(monthExpenseMinor, user.currency)}
            </span>
          </div>
        </div>

        {/* Performance Curve SVG */}
        <div className="w-full h-32 pt-2">
          <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />
            <line x1="0" y1="60" x2="400" y2="60" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />
            <path
              d="M 0 90 Q 50 110, 100 50 T 200 70 T 300 40 T 400 30 L 400 120 L 0 120 Z"
              fill="url(#curveGradient)"
            />
            <path
              d="M 0 90 Q 50 110, 100 50 T 200 70 T 300 40 T 400 30"
              fill="none"
              stroke="#22C55E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="300" cy="40" r="5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* 5. RECENT TRANSACTIONS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-ink">Recent Activity</span>
          <Link
            href="/transactions"
            className="text-xs font-black text-muted hover:text-ink transition-colors"
          >
            See All →
          </Link>
        </div>

        {txs.length === 0 ? (
          <EmptyState
            title="No Activity Yet"
            description="Use the colored buttons above to record your first transaction."
            actionLabel="+ Add Transaction"
            onAction={() => {
              setSelectedTx(null);
              setIsSheetOpen(true);
            }}
          />
        ) : (
          <div className="bg-surface rounded-card border-2 border-border shadow-neo overflow-hidden divide-y-2 divide-border">
            {txs.slice(0, 5).map((tx) => {
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    setSelectedTx(tx);
                    setIsSheetOpen(true);
                  }}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-surface-subtle transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-btn border-2 border-border flex items-center justify-center font-black text-base shrink-0 ${
                        isExpense
                          ? "bg-neo-coral"
                          : isIncome
                          ? "bg-neo-cyan"
                          : "bg-neo-yellow"
                      }`}
                    >
                      {isExpense ? "↓" : isIncome ? "↑" : "⇄"}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-black text-ink truncate block">
                        {tx.merchant}
                      </span>
                      <span className="text-xs font-bold text-muted truncate block">
                        {isTransfer
                          ? `⇄ ${tx.walletName || "Account"} → ${tx.toWalletName || "Destination"}`
                          : `${tx.categoryName || "Uncategorized"} • ${tx.walletName || "Default"}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-black text-ink block font-mono">
                      {isExpense ? "-" : isIncome ? "+" : "⇄ "}
                      {formatMoney(tx.amountMinor, tx.currency)}
                    </span>
                    <span
                      className={`text-[11px] font-black ${
                        isExpense
                          ? "text-rose-600 dark:text-rose-400"
                          : isIncome
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-ink"
                      }`}
                    >
                      {isExpense ? "▼ Expense" : isIncome ? "▲ Income" : "⇄ Transfer"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TRANSACTION SHEET */}
      <TransactionSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setSelectedTx(null);
        }}
        onSaved={refreshData}
        categories={categories}
        wallets={wallets}
        userCurrency={user.currency}
        initialTransaction={selectedTx}
      />
    </div>
  );
}

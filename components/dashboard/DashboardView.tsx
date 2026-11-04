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
    type: "income" | "expense";
    amountMinor: number;
    currency: string;
    categoryId: string;
    categoryName?: string | null;
    walletId: string;
    walletName?: string | null;
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
  wallets,
}: DashboardViewProps) {
  const [txs, setTxs] = React.useState(initialTxs);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [selectedTx, setSelectedTx] = React.useState<TransactionItem | null>(null);
  const [isBalanceHidden, setIsBalanceHidden] = React.useState(false);

  const refreshTxs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/transactions?limit=50");
      if (res.ok) {
        const data = await res.json();
        setTxs(data.transactions || []);
      }
    } catch (e) {
      console.error("Refresh failed", e);
    }
  }, []);

  // Compute Current Month Stats
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;

  const monthTxs = txs.filter((t) => {
    const d = new Date(t.occurredAt);
    if (isNaN(d.getTime())) return false;
    return d.toISOString().startsWith(currentMonthYear);
  });

  const monthIncomeMinor = monthTxs
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amountMinor, 0);

  const monthExpenseMinor = monthTxs
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amountMinor, 0);

  const totalBalanceMinor = monthIncomeMinor - monthExpenseMinor;

  return (
    <div className="space-y-6">
      {/* 1. HERO TOTAL BALANCE (Matching mockup) */}
      <div className="pt-2">
        <span className="text-xs font-bold text-muted block mb-1">
          Total Portfolio Value
        </span>
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-ink tracking-tight">
            {isBalanceHidden
              ? "••••••••"
              : `${totalBalanceMinor < 0 ? "-" : ""}${formatMoney(
                  Math.abs(totalBalanceMinor),
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
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>▲</span>
            <span>+{formatMoney(monthIncomeMinor, user.currency)} This Month</span>
          </span>
        </div>
      </div>

      {/* 2. FOUR COLORFUL NEO-BRUTALIST ACTION TILES (Deposit, Withdraw, Transfer, More) */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {/* Deposit / Add Income */}
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

        {/* Withdraw / Record Expense */}
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

        {/* Transfer / Scan Receipt */}
        <Link
          href="/scan"
          className="bg-neo-yellow border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">Scan AI</span>
        </Link>

        {/* More / Vault */}
        <Link
          href="/vault"
          className="bg-neo-coral border-2 border-border rounded-btn p-3 sm:p-4 shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex flex-col items-center justify-center text-center select-none"
        >
          <div className="w-8 h-8 rounded-full border-2 border-border bg-surface flex items-center justify-center mb-1 text-ink">
            <span className="font-black text-lg leading-none">•••</span>
          </div>
          <span className="text-xs font-black text-ink mt-0.5">QR Vault</span>
        </Link>
      </div>

      {/* 3. PERFORMANCE CARD WITH CURVE (Matching mockup) */}
      <div className="bg-surface rounded-card border-2 border-border p-5 shadow-neo">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-ink">Performance</span>
          <div className="px-3 py-1 rounded-full border-2 border-border bg-surface-subtle text-xs font-extrabold flex items-center gap-1.5">
            <span>Month</span>
            <span className="text-[10px]">▼</span>
          </div>
        </div>

        {/* SVG Curve Chart */}
        <div className="relative pt-2">
          {/* Chart Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn bg-ink text-surface text-xs font-black mb-2 shadow-neo-sm">
            <span>+{formatMoney(monthIncomeMinor, user.currency)}</span>
            <span className="text-emerald-400 text-[10px]">▲ Inflow</span>
          </div>

          <div className="w-full h-36">
            <svg viewBox="0 0 400 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="20" x2="400" y2="20" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="400" y2="60" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="currentColor" className="text-border/20" strokeDasharray="3 3" />

              {/* Area fill */}
              <path
                d="M 0 90 Q 50 110, 100 50 T 200 70 T 300 40 T 400 30 L 400 120 L 0 120 Z"
                fill="url(#curveGradient)"
              />

              {/* Main Curve line */}
              <path
                d="M 0 90 Q 50 110, 100 50 T 200 70 T 300 40 T 400 30"
                fill="none"
                stroke="#22C55E"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Active data point */}
              <circle cx="300" cy="40" r="5" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex justify-between text-[11px] font-bold text-muted pt-2 border-t border-border/20">
            <span>W1</span>
            <span>W2</span>
            <span>W3</span>
            <span>W4</span>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 4. TOP HOLDINGS / RECENT TRANSACTIONS (Matching mockup list style) */}
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
                    <div className={`w-11 h-11 rounded-btn border-2 border-border flex items-center justify-center font-black text-base shrink-0 ${
                      isExpense ? "bg-neo-coral" : "bg-neo-cyan"
                    }`}>
                      {isExpense ? "↓" : "↑"}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-black text-ink truncate block">
                        {tx.merchant}
                      </span>
                      <span className="text-xs font-bold text-muted truncate block">
                        {tx.categoryName || "Uncategorized"} • {new Date(tx.occurredAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-black text-ink block">
                      {isExpense ? "-" : "+"}{formatMoney(tx.amountMinor, tx.currency)}
                    </span>
                    <span className={`text-[11px] font-black ${
                      isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {isExpense ? "▼ Expense" : "▲ Income"}
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
        onSaved={refreshTxs}
        categories={categories}
        wallets={wallets}
        userCurrency={user.currency}
        initialTransaction={selectedTx}
      />
    </div>
  );
}

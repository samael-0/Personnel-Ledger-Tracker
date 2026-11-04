"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import {
  TransactionSheet,
  type Category,
  type Wallet,
} from "./TransactionSheet";
import { formatMoney } from "@/lib/money";
import { getCategoryIconSymbol } from "@/lib/data/category-icons";

export interface TransactionRecord {
  id: string;
  userId: string;
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
  receiptId?: string | null;
}

interface TransactionListViewProps {
  initialTransactions: TransactionRecord[];
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
}

export function TransactionListView({
  initialTransactions,
  categories,
  wallets,
  userCurrency,
}: TransactionListViewProps) {
  const [txs, setTxs] = React.useState<TransactionRecord[]>(initialTransactions);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [walletFilter, setWalletFilter] = React.useState<string>("all");

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<TransactionRecord | null>(null);

  const [viewingReceiptId, setViewingReceiptId] = React.useState<string | null>(null);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (walletFilter !== "all") params.set("walletId", walletFilter);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTxs(data.transactions || []);
      }
    } catch (e) {
      console.error("Failed to load transactions", e);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, categoryFilter, walletFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  // Group transactions by Date string (YYYY-MM-DD)
  const groupedByDay = React.useMemo(() => {
    const groups: { [dateStr: string]: TransactionRecord[] } = {};
    for (const tx of txs) {
      const d = new Date(tx.occurredAt);
      const dateKey = isNaN(d.getTime())
        ? "Other"
        : d.toISOString().split("T")[0];
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txs]);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-card border-2 border-border shadow-neo">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
            Transaction Ledger
          </h1>
          <p className="text-xs font-medium text-muted mt-0.5">
            Exact minor units recorded across accounts in {userCurrency}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingTx(null);
            setIsSheetOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          + Add Entry
        </Button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <Input
              type="text"
              placeholder="Search merchant, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types (+ / - / ⇄)</option>
              <option value="expense">Expense Only (-)</option>
              <option value="income">Income Only (+)</option>
              <option value="transfer">Transfer Only (⇄)</option>
            </Select>
          </div>
          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCategoryIconSymbol(c.icon)} {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
            >
              <option value="all">All Accounts</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.currency})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* LIST OR EMPTY STATE */}
      {loading && txs.length === 0 ? (
        <div className="bg-surface rounded-card border-2 border-border p-8 text-center text-sm font-bold text-muted shadow-neo-sm">
          Loading Transactions...
        </div>
      ) : groupedByDay.length === 0 ? (
        <EmptyState
          title="No Transactions Found"
          description="No entries match your current search and filter parameters, or your ledger is empty."
          actionLabel="Record First Transaction"
          onAction={() => {
            setEditingTx(null);
            setIsSheetOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {groupedByDay.map(([dateStr, items]) => {
            // Day net excludes transfers except for transfer fees
            const dayNetMinor = items.reduce((acc, curr) => {
              if (curr.type === "income") return acc + curr.amountMinor;
              if (curr.type === "expense") return acc - curr.amountMinor;
              if (curr.type === "transfer" && curr.transferFeeMinor) {
                return acc - curr.transferFeeMinor;
              }
              return acc;
            }, 0);

            return (
              <div
                key={dateStr}
                className="bg-surface rounded-card border-2 border-border shadow-neo-sm overflow-hidden"
              >
                {/* DAY HEADER */}
                <div className="bg-surface-subtle/80 px-4 py-3 border-b-2 border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">
                    {dateStr}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted">Day Net:</span>
                    <span
                      className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-pill border-2 border-border ${
                        dayNetMinor >= 0
                          ? "bg-neo-green text-ink"
                          : "bg-neo-coral text-ink"
                      }`}
                    >
                      {dayNetMinor >= 0 ? "+" : "-"}
                      {formatMoney(Math.abs(dayNetMinor), userCurrency)}
                    </span>
                  </div>
                </div>

                {/* TRANSACTIONS ROWS */}
                <div className="divide-y-2 divide-border">
                  {items.map((tx) => {
                    const isExpense = tx.type === "expense";
                    const isIncome = tx.type === "income";
                    const isTransfer = tx.type === "transfer";

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 hover:bg-surface-subtle/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
                        onClick={() => {
                          setEditingTx(tx);
                          setIsSheetOpen(true);
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-ink truncate">
                              {tx.merchant}
                            </span>
                            {tx.source === "receipt" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (tx.receiptId) {
                                    setViewingReceiptId(tx.receiptId);
                                  }
                                }}
                                className="text-[10px] font-bold bg-neo-cyan text-ink border border-border px-2 py-0.5 rounded-pill shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px]"
                              >
                                View Receipt
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted flex-wrap">
                            {isTransfer ? (
                              <span className="bg-neo-yellow/30 border border-border px-2 py-0.5 rounded-pill text-[11px] font-bold text-ink">
                                ⇄ {tx.walletName || "Account"} → {tx.toWalletName || "Destination"}
                              </span>
                            ) : (
                              <>
                                <span className="bg-surface-subtle border border-border px-2 py-0.5 rounded-pill text-[11px] font-bold text-ink">
                                  {getCategoryIconSymbol(tx.categoryIcon)}{" "}
                                  {tx.categoryName || "Uncategorized"}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-ink">
                                  {tx.walletName || "Default Account"}
                                </span>
                              </>
                            )}

                            {tx.note && (
                              <>
                                <span>•</span>
                                <span className="truncate italic max-w-xs">
                                  {tx.note}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* AMOUNT WITH +/- OR ⇄ SIGN AND TEXT LABEL */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-sm sm:text-base font-extrabold font-mono font-tabular ${
                              isExpense
                                ? "text-danger"
                                : isIncome
                                ? "text-accent"
                                : "text-ink"
                            }`}
                          >
                            {isExpense ? "-" : isIncome ? "+" : "⇄ "}
                            {formatMoney(tx.amountMinor, tx.currency)}
                          </div>
                          <div
                            className={`text-[10px] font-bold mt-0.5 ${
                              isExpense
                                ? "text-danger"
                                : isIncome
                                ? "text-accent"
                                : "text-muted"
                            }`}
                          >
                            {isExpense
                              ? "Expense (-)"
                              : isIncome
                              ? "Income (+)"
                              : "Transfer (⇄)"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TRANSACTION SHEET (ADD / EDIT) */}
      <TransactionSheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
          setEditingTx(null);
        }}
        onSaved={fetchTransactions}
        categories={categories}
        wallets={wallets}
        userCurrency={userCurrency}
        initialTransaction={editingTx}
      />

      {/* RECEIPT IMAGE VIEWER MODAL */}
      <Dialog
        isOpen={!!viewingReceiptId}
        onClose={() => setViewingReceiptId(null)}
        title="Attached Scanned Receipt"
        description="Authentic image preserved in database."
        variant="modal"
      >
        {viewingReceiptId && (
          <div className="space-y-4">
            <div className="rounded-card border-2 border-border bg-slate-950 p-2 flex items-center justify-center min-h-[300px] shadow-neo-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/receipts/${viewingReceiptId}`}
                alt="Receipt"
                className="max-h-[60vh] object-contain rounded-btn"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="quiet"
                onClick={() => setViewingReceiptId(null)}
              >
                Close Receipt
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

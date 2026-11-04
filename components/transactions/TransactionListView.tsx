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
  const [receiptFilter, setReceiptFilter] = React.useState<string>("all");

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
      if (receiptFilter === "with_receipt") params.set("hasReceipt", "true");
      if (receiptFilter === "no_receipt") params.set("hasReceipt", "false");

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
  }, [search, typeFilter, categoryFilter, walletFilter, receiptFilter]);

  const isFirstMount = React.useRef(true);

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchTransactions]);

  const handleOptimisticSaved = React.useCallback(
    (optimisticTx?: any, action?: "add" | "edit" | "delete") => {
      if (!optimisticTx) {
        fetchTransactions();
        return;
      }
      if (action === "delete") {
        setTxs((prev) => prev.filter((t) => t.id !== optimisticTx.id));
      } else if (action === "edit") {
        setTxs((prev) =>
          prev.map((t) =>
            t.id === optimisticTx.id
              ? ({
                  ...t,
                  ...optimisticTx,
                  occurredAt: new Date(optimisticTx.occurredAt),
                } as TransactionRecord)
              : t
          )
        );
      } else if (action === "add") {
        const fullItem: TransactionRecord = {
          id: optimisticTx.id || `temp-${Date.now()}`,
          userId: "",
          type: optimisticTx.type,
          amountMinor: optimisticTx.amountMinor,
          currency: optimisticTx.currency,
          categoryId: optimisticTx.categoryId,
          categoryName: categories.find((c) => c.id === optimisticTx.categoryId)?.name,
          categoryIcon: categories.find((c) => c.id === optimisticTx.categoryId)?.icon,
          walletId: optimisticTx.walletId,
          walletName: wallets.find((w) => w.id === optimisticTx.walletId)?.name,
          toWalletId: optimisticTx.toWalletId,
          toWalletName: wallets.find((w) => w.id === optimisticTx.toWalletId)?.name,
          toAmountMinor: optimisticTx.toAmountMinor,
          transferFeeMinor: optimisticTx.transferFeeMinor,
          merchant: optimisticTx.merchant,
          note: optimisticTx.note,
          occurredAt: new Date(optimisticTx.occurredAt),
          source: optimisticTx.source || "manual",
          receiptId: optimisticTx.receiptId || null,
        };
        setTxs((prev) => [fullItem, ...prev]);
      }
    },
    [categories, wallets, fetchTransactions]
  );

  // Group transactions by Date Header
  const groupedByDay = React.useMemo(() => {
    const groups: Record<string, TransactionRecord[]> = {};
    for (const tx of txs) {
      const d = new Date(tx.occurredAt);
      const dateKey = isNaN(d.getTime())
        ? "Invalid Date"
        : d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(tx);
    }
    return Object.entries(groups);
  }, [txs]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
              Transaction Ledger
            </h1>
            <p className="text-xs font-medium text-muted mt-0.5">
              Unified double-entry records with attached receipt evidence.
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingTx(null);
              setIsSheetOpen(true);
            }}
          >
            + Add Transaction
          </Button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="lg:col-span-2">
            <Input
              type="text"
              placeholder="Search merchant, notes, receipts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by transaction type"
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
              aria-label="Filter by category"
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
              value={receiptFilter}
              onChange={(e) => setReceiptFilter(e.target.value)}
              aria-label="Filter by receipt attachment"
            >
              <option value="all">All Receipts</option>
              <option value="with_receipt">Has Receipt Photo</option>
              <option value="no_receipt">No Receipt Photo</option>
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
                            {/* REQUIREMENT 4: ACCESSIBLE "HAS RECEIPT" LABEL/ICON */}
                            {tx.receiptId && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingReceiptId(tx.receiptId!);
                                }}
                                aria-label="Has receipt photo - click to view"
                                title="Has receipt photo"
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-neo-yellow/30 hover:bg-neo-yellow/60 border border-border px-2 py-0.5 rounded-pill text-ink transition-colors shadow-neo-sm"
                              >
                                <svg
                                  className="w-3 h-3 text-ink"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                <span>Has Receipt</span>
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
        onSaved={handleOptimisticSaved}
        categories={categories}
        wallets={wallets}
        userCurrency={userCurrency}
        initialTransaction={editingTx}
      />

      {/* RECEIPT IMAGE VIEWER MODAL */}
      <Dialog
        isOpen={!!viewingReceiptId}
        onClose={() => setViewingReceiptId(null)}
        title="Attached Receipt Photo"
        description="Authentic image preserved securely in database."
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
            <div className="flex justify-between items-center pt-2">
              <a
                href={`/api/receipts/${viewingReceiptId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-ink underline hover:text-primary"
              >
                Open Full Size ↗
              </a>
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

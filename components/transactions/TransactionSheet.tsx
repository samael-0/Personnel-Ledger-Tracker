"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { getCurrencyMeta, parseToMinorUnits } from "@/lib/money";

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
}

export interface Wallet {
  id: string;
  name: string;
  type: string;
  currency: string;
}

export interface TransactionItem {
  id?: string;
  type: "income" | "expense";
  amountMinor: number;
  currency: string;
  categoryId: string;
  walletId: string;
  merchant: string;
  note?: string | null;
  occurredAt: string | Date;
}

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
  initialTransaction?: TransactionItem | null;
}

export function TransactionSheet({
  isOpen,
  onClose,
  onSaved,
  categories,
  wallets,
  userCurrency,
  initialTransaction,
}: TransactionSheetProps) {
  const [type, setType] = React.useState<"income" | "expense">("expense");
  const [amountStr, setAmountStr] = React.useState("0");
  const [merchant, setMerchant] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [dateStr, setDateStr] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state when editing or opening
  React.useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr((initialTransaction.amountMinor / 100).toString());
      setMerchant(initialTransaction.merchant);
      setCategoryId(initialTransaction.categoryId);
      setWalletId(initialTransaction.walletId);
      const d = new Date(initialTransaction.occurredAt);
      setDateStr(d.toISOString().split("T")[0]);
      setNote(initialTransaction.note || "");
    } else {
      setType("expense");
      setAmountStr("0");
      setMerchant("");
      setDateStr(new Date().toISOString().split("T")[0]);
      setNote("");
      const filtered = categories.filter((c) => c.kind === "expense");
      if (filtered.length > 0) setCategoryId(filtered[0].id);
      if (wallets.length > 0) setWalletId(wallets[0].id);
    }
  }, [initialTransaction, isOpen, categories, wallets]);

  // Keypad button handler
  function handleKeyPress(char: string) {
    if (char === "C") {
      setAmountStr("0");
      return;
    }
    if (char === "⌫") {
      if (amountStr.length <= 1) {
        setAmountStr("0");
      } else {
        setAmountStr(amountStr.slice(0, -1));
      }
      return;
    }
    if (char === ".") {
      if (!amountStr.includes(".")) {
        setAmountStr(amountStr + ".");
      }
      return;
    }
    if (amountStr === "0") {
      setAmountStr(char);
    } else {
      // Limit to 2 decimal places
      if (amountStr.includes(".")) {
        const parts = amountStr.split(".");
        if (parts[1] && parts[1].length >= 2) return;
      }
      if (amountStr.length < 9) {
        setAmountStr(amountStr + char);
      }
    }
  }

  const currencyMeta = getCurrencyMeta(userCurrency);
  const availableCategories = categories.filter((c) => c.kind === type);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountMinor = parseToMinorUnits(amountStr, userCurrency);
    if (amountMinor <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!merchant.trim()) {
      setError("Please enter a merchant or description.");
      return;
    }
    if (!categoryId) {
      setError("Please choose a category.");
      return;
    }
    if (!walletId) {
      setError("Please choose a wallet or payment method.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        id: initialTransaction?.id,
        type,
        amountMinor,
        currency: userCurrency,
        categoryId,
        walletId,
        merchant: merchant.trim(),
        note: note.trim() || null,
        occurredAt: new Date(dateStr).toISOString(),
        source: "manual",
      };

      const method = initialTransaction?.id ? "PUT" : "POST";
      const res = await fetch("/api/transactions", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record transaction");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initialTransaction?.id) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?id=${initialTransaction.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error deleting";
      setError(message);
      setLoading(false);
    }
  }

  const keypadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction?.id ? "Edit Transaction" : "New Transaction"}
      description="Rapid one-handed numeric entry in minor units."
      variant="sheet"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-neo-coral/20 text-ink rounded-btn border-2 border-border font-bold text-xs shadow-neo-sm">
            {error}
          </div>
        )}

        {/* TYPE TOGGLE: INCOME / EXPENSE */}
        <div className="grid grid-cols-2 p-1.5 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm gap-1.5">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`py-2 text-xs font-bold rounded-control transition-all select-none ${
              type === "expense"
                ? "bg-neo-coral text-ink border-2 border-border shadow-neo-sm font-extrabold"
                : "text-muted hover:text-ink"
            }`}
          >
            - Expense
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`py-2 text-xs font-bold rounded-control transition-all select-none ${
              type === "income"
                ? "bg-neo-green text-ink border-2 border-border shadow-neo-sm font-extrabold"
                : "text-muted hover:text-ink"
            }`}
          >
            + Income
          </button>
        </div>

        {/* AMOUNT DISPLAY */}
        <div className="p-4 rounded-card border-2 border-border bg-surface flex items-center justify-between shadow-neo-sm">
          <span className="text-base font-bold font-mono text-muted">
            {currencyMeta.symbol}
          </span>
          <span
            className={`text-3xl sm:text-4xl font-extrabold font-mono font-tabular tracking-tight ${
              type === "expense" ? "text-danger" : "text-accent"
            }`}
          >
            {type === "expense" ? "-" : "+"}
            {amountStr}
          </span>
          <button
            type="button"
            onClick={() => setAmountStr("0")}
            className="text-xs font-bold text-muted hover:text-ink px-2 py-1 rounded-control border border-border/40 hover:border-border"
          >
            Clear
          </button>
        </div>

        {/* NUMERIC KEYPAD */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-surface-subtle rounded-card border-2 border-border shadow-neo-sm">
          {keypadKeys.map((row, rIdx) =>
            row.map((k) => (
              <button
                key={`${rIdx}-${k}`}
                type="button"
                onClick={() => handleKeyPress(k)}
                className="h-12 bg-surface hover:bg-surface-subtle text-ink font-mono font-extrabold text-lg rounded-btn border-2 border-border shadow-neo-sm active:translate-x-[1px] active:translate-y-[1px] transition-all select-none"
              >
                {k}
              </button>
            ))
          )}
        </div>

        {/* METADATA FIELDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Field label="Merchant or Description" required>
            <Input
              type="text"
              placeholder="e.g. Grocery Store, Client Inc"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              required
            />
          </Field>

          <Field label="Category" required>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {availableCategories.length === 0 ? (
                <option value="">No categories found</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </Select>
          </Field>

          <Field label="Wallet / Account" required>
            <Select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              required
            >
              {wallets.length === 0 ? (
                <option value="">No wallets found</option>
              ) : (
                wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))
              )}
            </Select>
          </Field>

          <Field label="Date" required>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Optional Note">
          <Input
            type="text"
            placeholder="Add contextual details or invoice number..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {/* ACTIONS */}
        <div className="flex gap-3 pt-3 border-t-2 border-border">
          {initialTransaction?.id && (
            <Button
              type="button"
              variant="danger"
              size="md"
              disabled={loading}
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : initialTransaction?.id
              ? "Update Entry"
              : type === "expense"
              ? "Record Expense (-)"
              : "Record Income (+)"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

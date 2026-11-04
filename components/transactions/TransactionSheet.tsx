"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { getCurrencyMeta, parseToMinorUnits } from "@/lib/money";
import { compressImage } from "@/lib/client-image";
import {
  CATEGORY_ICON_PRESETS,
  getCategoryIconSymbol,
} from "@/lib/data/category-icons";

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon?: string | null;
  isArchived?: boolean;
}

export interface Wallet {
  id: string;
  name: string;
  type: string;
  currency: string;
  isDefault?: boolean;
  isArchived?: boolean;
  currentBalanceMinor?: number;
}

export interface TransactionItem {
  id?: string;
  type: "income" | "expense" | "transfer";
  amountMinor: number;
  currency: string;
  categoryId?: string | null;
  walletId: string;
  toWalletId?: string | null;
  toAmountMinor?: number | null;
  transferFeeMinor?: number | null;
  merchant: string;
  note?: string | null;
  occurredAt: string | Date;
  receiptId?: string | null;
}

interface TransactionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (optimisticTx?: TransactionItem, action?: "add" | "edit" | "delete") => void;
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
  initialTransaction?: TransactionItem | null;
  onCategoryCreated?: (newCategory: Category) => void;
}

export function TransactionSheet({
  isOpen,
  onClose,
  onSaved,
  categories: initialCategories,
  wallets,
  userCurrency,
  initialTransaction,
  onCategoryCreated,
}: TransactionSheetProps) {
  const [type, setType] = React.useState<"income" | "expense" | "transfer">("expense");
  const [amountStr, setAmountStr] = React.useState("0");
  const [toAmountStr, setToAmountStr] = React.useState("");
  const [transferFeeStr, setTransferFeeStr] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [toWalletId, setToWalletId] = React.useState("");
  const [dateStr, setDateStr] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Optional Receipt Attachment State
  const [existingReceiptId, setExistingReceiptId] = React.useState<string | null>(null);
  const [newReceiptFile, setNewReceiptFile] = React.useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = React.useState<string | null>(null);
  const [isPhotoRemoved, setIsPhotoRemoved] = React.useState(false);

  const receiptCameraRef = React.useRef<HTMLInputElement>(null);
  const receiptFileRef = React.useRef<HTMLInputElement>(null);

  // Categories list with live additions
  const [localCategories, setLocalCategories] = React.useState<Category[]>(initialCategories);

  React.useEffect(() => {
    setLocalCategories(initialCategories);
  }, [initialCategories]);

  // Inline "Add new category" modal state
  const [showAddCategory, setShowAddCategory] = React.useState(false);
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatIcon, setNewCatIcon] = React.useState("food");
  const [savingCategory, setSavingCategory] = React.useState(false);

  // Find default account
  const defaultWallet = React.useMemo(() => {
    return wallets.find((w) => w.isDefault && !w.isArchived) || wallets.find((w) => !w.isArchived) || wallets[0];
  }, [wallets]);

  // Sync state when editing or opening
  React.useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountStr((initialTransaction.amountMinor / 100).toString());
      setToAmountStr(
        initialTransaction.toAmountMinor
          ? (initialTransaction.toAmountMinor / 100).toString()
          : ""
      );
      setTransferFeeStr(
        initialTransaction.transferFeeMinor
          ? (initialTransaction.transferFeeMinor / 100).toString()
          : ""
      );
      setMerchant(initialTransaction.merchant);
      setCategoryId(initialTransaction.categoryId || "");
      setWalletId(initialTransaction.walletId);
      setToWalletId(initialTransaction.toWalletId || "");
      const d = new Date(initialTransaction.occurredAt);
      setDateStr(d.toISOString().split("T")[0]);
      setNote(initialTransaction.note || "");

      if (initialTransaction.receiptId) {
        setExistingReceiptId(initialTransaction.receiptId);
        setReceiptPreview(`/api/receipts/${initialTransaction.receiptId}`);
        setIsPhotoRemoved(false);
        setNewReceiptFile(null);
      } else {
        setExistingReceiptId(null);
        setReceiptPreview(null);
        setIsPhotoRemoved(false);
        setNewReceiptFile(null);
      }
    } else {
      setType("expense");
      setAmountStr("0");
      setToAmountStr("");
      setTransferFeeStr("");
      setMerchant("");
      setDateStr(new Date().toISOString().split("T")[0]);
      setNote("");
      setExistingReceiptId(null);
      setReceiptPreview(null);
      setIsPhotoRemoved(false);
      setNewReceiptFile(null);

      const activeCategories = localCategories.filter((c) => c.kind === "expense" && !c.isArchived);
      if (activeCategories.length > 0) setCategoryId(activeCategories[0].id);

      if (defaultWallet) {
        setWalletId(defaultWallet.id);
      }
      const otherAccount = wallets.find((w) => !w.isArchived && w.id !== defaultWallet?.id);
      if (otherAccount) {
        setToWalletId(otherAccount.id);
      }
    }
  }, [initialTransaction, isOpen, wallets, defaultWallet]);

  function handleAttachPhoto(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError("Receipt image must be under 5MB in size.");
      return;
    }
    setNewReceiptFile(file);
    setIsPhotoRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  }

  function handleRemovePhoto() {
    setNewReceiptFile(null);
    setIsPhotoRemoved(true);
    setReceiptPreview(null);
  }

  // Active accounts (exclude archived unless currently selected)
  const availableWallets = React.useMemo(() => {
    return wallets.filter((w) => !w.isArchived || w.id === walletId || w.id === toWalletId);
  }, [wallets, walletId, toWalletId]);

  const selectedSourceWallet = wallets.find((w) => w.id === walletId);
  const selectedDestWallet = wallets.find((w) => w.id === toWalletId);

  const isCrossCurrency =
    type === "transfer" &&
    selectedSourceWallet &&
    selectedDestWallet &&
    selectedSourceWallet.currency !== selectedDestWallet.currency;

  const availableCategories = React.useMemo(() => {
    if (type === "transfer") return [];
    return localCategories.filter(
      (c) => c.kind === type && (!c.isArchived || c.id === categoryId)
    );
  }, [localCategories, type, categoryId]);

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
      if (amountStr.includes(".")) {
        const parts = amountStr.split(".");
        if (parts[1] && parts[1].length >= 2) return;
      }
      if (amountStr.length < 9) {
        setAmountStr(amountStr + char);
      }
    }
  }

  async function handleCreateCategoryInline(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSavingCategory(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          kind: type === "transfer" ? "expense" : type,
          icon: newCatIcon,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      const created: Category = data.category;
      setLocalCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      onCategoryCreated?.(created);
      setShowAddCategory(false);
      setNewCatName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating category");
    } finally {
      setSavingCategory(false);
    }
  }

  const currencyMeta = getCurrencyMeta(selectedSourceWallet?.currency || userCurrency);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountMinor = parseToMinorUnits(amountStr, selectedSourceWallet?.currency || userCurrency);
    if (amountMinor <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }

    if (!walletId) {
      setError("Please select a source account.");
      return;
    }

    let toAmountMinor: number | null = null;
    let transferFeeMinor = 0;

    if (type === "transfer") {
      if (!toWalletId) {
        setError("Please select a destination account.");
        return;
      }
      if (walletId === toWalletId) {
        setError("Transfer source and destination account cannot be the same.");
        return;
      }

      if (isCrossCurrency) {
        if (!toAmountStr.trim()) {
          setError(
            `Please specify the destination amount in ${selectedDestWallet?.currency}.`
          );
          return;
        }
        toAmountMinor = parseToMinorUnits(
          toAmountStr,
          selectedDestWallet?.currency || userCurrency
        );
        if (toAmountMinor <= 0) {
          setError("Destination amount must be greater than zero.");
          return;
        }
      }

      if (transferFeeStr.trim()) {
        transferFeeMinor = parseToMinorUnits(
          transferFeeStr,
          selectedSourceWallet?.currency || userCurrency
        );
      }
    } else {
      if (!categoryId) {
        setError("Please choose a category.");
        return;
      }
      if (!merchant.trim()) {
        setError("Please enter a merchant or description.");
        return;
      }
    }

    setLoading(true);

    let targetReceiptId: string | null = null;
    let photoUploadFailed = false;

    try {
      // Handle photo upload if a new file was chosen
      if (newReceiptFile && type !== "transfer") {
        try {
          const compressed = await compressImage(newReceiptFile, 1600, 0.85);
          const formData = new FormData();
          formData.append("file", compressed);
          const uploadRes = await fetch("/api/receipts", {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            const uData = await uploadRes.json();
            targetReceiptId = uData.receiptId;
          } else {
            photoUploadFailed = true;
          }
        } catch (uErr) {
          console.warn("Receipt upload error:", uErr);
          photoUploadFailed = true;
        }
      } else if (isPhotoRemoved) {
        targetReceiptId = null;
      } else if (existingReceiptId) {
        targetReceiptId = existingReceiptId;
      }

      const payload: TransactionItem = {
        id: initialTransaction?.id,
        type,
        amountMinor,
        currency: selectedSourceWallet?.currency || userCurrency,
        categoryId: type === "transfer" ? null : categoryId,
        walletId,
        toWalletId: type === "transfer" ? toWalletId : null,
        toAmountMinor: type === "transfer" ? toAmountMinor : null,
        transferFeeMinor: type === "transfer" ? transferFeeMinor : 0,
        merchant:
          type === "transfer"
            ? merchant.trim() || `Transfer to ${selectedDestWallet?.name || "Account"}`
            : merchant.trim(),
        note: note.trim() || null,
        occurredAt: new Date(dateStr).toISOString(),
        receiptId: targetReceiptId,
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

      if (photoUploadFailed) {
        alert("Transaction was saved successfully, but the receipt photo failed to upload. You can re-attach it by editing this transaction.");
      }

      onSaved(payload, initialTransaction?.id ? "edit" : "add");
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
      onSaved(initialTransaction, "delete");
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
      description="One-handed entry with instant account balance calculation."
      variant="sheet"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-neo-coral/20 text-ink rounded-btn border-2 border-border font-bold text-xs shadow-neo-sm">
            {error}
          </div>
        )}

        {/* TYPE TOGGLE: INCOME / EXPENSE / TRANSFER */}
        <div className="grid grid-cols-3 p-1.5 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm gap-1.5">
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
          <button
            type="button"
            onClick={() => setType("transfer")}
            className={`py-2 text-xs font-bold rounded-control transition-all select-none ${
              type === "transfer"
                ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm font-extrabold"
                : "text-muted hover:text-ink"
            }`}
          >
            ⇄ Transfer
          </button>
        </div>

        {/* AMOUNT DISPLAY */}
        <div className="p-4 rounded-card border-2 border-border bg-surface flex items-center justify-between shadow-neo-sm">
          <span className="text-base font-bold font-mono text-muted">
            {currencyMeta.symbol}
          </span>
          <span
            className={`text-3xl sm:text-4xl font-extrabold font-mono font-tabular tracking-tight ${
              type === "expense"
                ? "text-danger"
                : type === "income"
                ? "text-accent"
                : "text-ink"
            }`}
          >
            {type === "expense" ? "-" : type === "income" ? "+" : "⇄ "}
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
        <div className="grid grid-cols-3 gap-2">
          {keypadKeys.map((row, rIdx) =>
            row.map((k) => (
              <button
                key={`${rIdx}-${k}`}
                type="button"
                onClick={() => handleKeyPress(k)}
                className="py-3 sm:py-3.5 bg-surface rounded-control border-2 border-border shadow-neo-sm font-mono font-extrabold text-base sm:text-lg text-ink hover:bg-surface-subtle active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none"
              >
                {k}
              </button>
            ))
          )}
        </div>

        {/* TRANSFER FIELDS */}
        {type === "transfer" ? (
          <div className="space-y-3 p-4 bg-surface-subtle border-2 border-border rounded-card shadow-neo-sm">
            <span className="text-xs font-extrabold text-ink block border-b-2 border-border pb-2">
              Transfer Routing
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="From Account" required>
                <Select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  required
                >
                  {availableWallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.currency})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="To Account" required>
                <Select
                  value={toWalletId}
                  onChange={(e) => setToWalletId(e.target.value)}
                  required
                >
                  <option value="">Select Destination...</option>
                  {availableWallets
                    .filter((w) => w.id !== walletId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.currency})
                      </option>
                    ))}
                </Select>
              </Field>
            </div>

            {isCrossCurrency && (
              <div className="p-3 bg-neo-yellow/20 border-2 border-border rounded-btn space-y-2">
                <span className="text-[11px] font-black text-ink block">
                  Cross-Currency Conversion ({selectedSourceWallet?.currency} → {selectedDestWallet?.currency})
                </span>
                <Field
                  label={`Destination Amount (${selectedDestWallet?.currency})`}
                  required
                >
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={toAmountStr}
                    onChange={(e) => setToAmountStr(e.target.value)}
                    required
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={`Transfer Fee (${selectedSourceWallet?.currency || userCurrency})`}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transferFeeStr}
                  onChange={(e) => setTransferFeeStr(e.target.value)}
                />
              </Field>

              <Field label="Transfer Date" required>
                <Input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  required
                />
              </Field>
            </div>
          </div>
        ) : (
          /* INCOME & EXPENSE FIELDS */
          <div className="space-y-3">
            <Field label="Account" required>
              <Select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                required
              >
                {availableWallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.currency})
                  </option>
                ))}
              </Select>
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-ink">Category</label>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="text-xs font-bold text-muted hover:text-ink transition-colors"
                >
                  {showAddCategory ? "Cancel New" : "+ New Category"}
                </button>
              </div>

              {showAddCategory ? (
                <div className="p-3 bg-surface-subtle border-2 border-border rounded-control space-y-2.5 shadow-neo-sm">
                  <Input
                    type="text"
                    placeholder="New category name..."
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 items-center">
                    <Select
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="flex-1"
                    >
                      {CATEGORY_ICON_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.symbol} {p.label}
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleCreateCategoryInline}
                      disabled={savingCategory || !newCatName.trim()}
                    >
                      {savingCategory ? "Saving..." : "Add"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  {availableCategories.length === 0 ? (
                    <option value="">No active categories</option>
                  ) : (
                    availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryIconSymbol(c.icon)} {c.name}
                      </option>
                    ))
                  )}
                </Select>
              )}
            </div>

            <Field label="Merchant or Description" required>
              <Input
                type="text"
                placeholder="e.g. Grocery Store, Client Inc"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />
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
        )}

        <Field label="Optional Note">
          <Input
            type="text"
            placeholder="Add contextual details or invoice number..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {/* OPTIONAL RECEIPT PHOTO (INCOME & EXPENSE ONLY) */}
        {type !== "transfer" && (
          <div className="space-y-2 pt-1 border-t-2 border-border">
            <span className="text-xs font-bold text-ink block">
              Receipt Photo (Optional)
            </span>

            {/* Hidden inputs */}
            <input
              ref={receiptCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttachPhoto(f);
              }}
            />
            <input
              ref={receiptFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAttachPhoto(f);
              }}
            />

            {receiptPreview ? (
              <div className="flex items-center gap-3 p-3 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm">
                <div className="w-14 h-14 rounded-btn border-2 border-border overflow-hidden bg-slate-950 shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptPreview}
                    alt="Attached receipt preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-ink block truncate">
                    {newReceiptFile ? newReceiptFile.name : "Saved Receipt Photo"}
                  </span>
                  <span className="text-[11px] text-muted block">
                    {newReceiptFile
                      ? `${Math.round(newReceiptFile.size / 1024)} KB (ready to save)`
                      : "Attached in database"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    onClick={() => receiptFileRef.current?.click()}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="quiet"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="text-danger hover:text-danger"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="cyan"
                  size="sm"
                  onClick={() => receiptFileRef.current?.click()}
                >
                  Attach Receipt Photo
                </Button>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => receiptCameraRef.current?.click()}
                >
                  Take Photo
                </Button>
              </div>
            )}
          </div>
        )}

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
              : type === "income"
              ? "Record Income (+)"
              : "Record Transfer (⇄)"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { type Category, type Wallet } from "./TransactionSheet";
import { CATEGORY_ICON_PRESETS, getCategoryIconSymbol } from "@/lib/data/category-icons";
import { formatMoney } from "@/lib/money";

interface ExtendedCategory extends Category {
  isDefault?: boolean;
  isHidden?: boolean;
}

interface CategoryWalletManagerProps {
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
  onRefresh: () => void;
}

export function CategoryWalletManager({
  categories: initialCategories,
  wallets,
  userCurrency,
  onRefresh,
}: CategoryWalletManagerProps) {
  const [categories, setCategories] = React.useState<ExtendedCategory[]>(initialCategories);
  const [kindFilter, setKindFilter] = React.useState<"all" | "expense" | "income" | "archived" | "hidden">("all");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Add category state
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatKind, setNewCatKind] = React.useState<"income" | "expense">("expense");
  const [newCatIcon, setNewCatIcon] = React.useState("tag");
  const [addingCat, setAddingCat] = React.useState(false);

  // Edit / Rename category state
  const [editingCat, setEditingCat] = React.useState<ExtendedCategory | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editKind, setEditKind] = React.useState<"income" | "expense">("expense");
  const [editIcon, setEditIcon] = React.useState("tag");
  const [editSaving, setEditSaving] = React.useState(false);

  // Merge category state
  const [mergeSource, setMergeSource] = React.useState<ExtendedCategory | null>(null);
  const [mergeTargetId, setMergeTargetId] = React.useState("");
  const [mergeSubmitting, setMergeSubmitting] = React.useState(false);

  // Delete blocked alert modal
  const [deleteBlockedCat, setDeleteBlockedCat] = React.useState<ExtendedCategory | null>(null);

  // Refresh category list from server including archived & hidden
  const refreshCategories = React.useCallback(async () => {
    try {
      const res = await fetch("/api/categories?includeArchived=true&includeHidden=true");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, []);

  React.useEffect(() => {
    refreshCategories();
  }, [refreshCategories]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setAddingCat(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          kind: newCatKind,
          icon: newCatIcon,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      setNewCatName("");
      setNewCatIcon("tag");
      setMessage({ text: `Category "${data.category.name}" created successfully.`, type: "success" });
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error creating category",
        type: "error",
      });
    } finally {
      setAddingCat(false);
    }
  }

  function handleOpenEdit(cat: ExtendedCategory) {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditKind(cat.kind);
    setEditIcon(cat.icon || "tag");
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat || !editName.trim()) return;

    setEditSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCat.id,
          name: editName.trim(),
          kind: editKind,
          icon: editIcon,
          isArchived: editingCat.isArchived,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      setMessage({ text: `Category "${editName.trim()}" updated.`, type: "success" });
      setEditingCat(null);
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error saving category",
        type: "error",
      });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleToggleArchive(cat: ExtendedCategory) {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cat.id,
          name: cat.name,
          kind: cat.kind,
          icon: cat.icon,
          isArchived: !cat.isArchived,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle archive");

      setMessage({
        text: cat.isArchived ? `Restored "${cat.name}".` : `Archived "${cat.name}".`,
        type: "success",
      });
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error archiving category",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleHideDefault(cat: ExtendedCategory) {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: cat.id,
          hide: !cat.isHidden,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update hidden status");

      setMessage({
        text: cat.isHidden ? `Default "${cat.name}" is now visible.` : `Default "${cat.name}" hidden.`,
        type: "success",
      });
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error updating category",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(cat: ExtendedCategory) {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.canMerge || data.canArchive) {
          // Has transactions: open merge / archive suggestion dialog
          setDeleteBlockedCat(cat);
          return;
        }
        throw new Error(data.error || "Failed to delete category");
      }

      setMessage({ text: `Category "${cat.name}" removed.`, type: "success" });
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error deleting category",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleOpenMerge(cat: ExtendedCategory) {
    setMergeSource(cat);
    // Find first other category of same kind
    const other = categories.find((c) => c.id !== cat.id && c.kind === cat.kind && !c.isArchived && !c.isHidden);
    setMergeTargetId(other ? other.id : "");
  }

  async function handleConfirmMerge() {
    if (!mergeSource || !mergeTargetId) return;

    setMergeSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCategoryId: mergeSource.id,
          toCategoryId: mergeTargetId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Merge failed");

      setMessage({ text: data.message || "Categories merged successfully.", type: "success" });
      setMergeSource(null);
      setDeleteBlockedCat(null);
      await refreshCategories();
      onRefresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error merging categories",
        type: "error",
      });
    } finally {
      setMergeSubmitting(false);
    }
  }

  // Filter categories according to selected tab
  const displayedCategories = React.useMemo(() => {
    return categories.filter((c) => {
      if (kindFilter === "archived") return c.isArchived;
      if (kindFilter === "hidden") return c.isHidden;
      if (c.isArchived || c.isHidden) return false;
      if (kindFilter === "all") return true;
      return c.kind === kindFilter;
    });
  }, [categories, kindFilter]);

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-3.5 rounded-btn border-2 border-border text-xs font-bold shadow-neo-sm ${
            message.type === "success"
              ? "bg-neo-green/20 text-ink"
              : "bg-neo-coral/20 text-ink"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CATEGORIES MANAGEMENT (col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* ADD CATEGORY CARD */}
          <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm">
            <h2 className="text-base font-extrabold text-ink border-b-2 border-border pb-3 mb-4">
              Add Custom Category
            </h2>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Field label="Category Name" required>
                    <Input
                      type="text"
                      placeholder="e.g. Subscriptions, Consulting, Gym"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      disabled={addingCat}
                      required
                    />
                  </Field>
                </div>

                <Field label="Kind" required>
                  <Select
                    value={newCatKind}
                    onChange={(e) => setNewCatKind(e.target.value as "income" | "expense")}
                    disabled={addingCat}
                    required
                  >
                    <option value="expense">Expense (-)</option>
                    <option value="income">Income (+)</option>
                  </Select>
                </Field>
              </div>

              {/* ICON PICKER */}
              <div>
                <label className="text-xs font-extrabold uppercase tracking-wider text-muted block mb-2">
                  Choose Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                  {CATEGORY_ICON_PRESETS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNewCatIcon(item.id)}
                      className={`h-10 rounded-btn border-2 text-base flex items-center justify-center transition-all ${
                        newCatIcon === item.id
                          ? "bg-neo-yellow border-border shadow-neo-sm scale-105"
                          : "bg-surface-subtle border-border/40 hover:border-border text-ink"
                      }`}
                      title={item.label}
                    >
                      {item.symbol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={addingCat || !newCatName.trim()}
                >
                  {addingCat ? "Adding..." : "+ Create Category"}
                </Button>
              </div>
            </form>
          </div>

          {/* CATEGORIES LIST WITH FILTER TABS */}
          <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
              <h2 className="text-base font-extrabold text-ink">
                All Categories ({displayedCategories.length})
              </h2>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "all", label: "All Active" },
                    { id: "expense", label: "Expenses" },
                    { id: "income", label: "Income" },
                    { id: "archived", label: "Archived" },
                    { id: "hidden", label: "Hidden Defaults" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setKindFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-btn text-xs font-black border-2 transition-all ${
                      kindFilter === tab.id
                        ? "bg-neo-yellow text-ink border-border shadow-neo-sm"
                        : "bg-surface text-muted border-transparent hover:border-border"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {displayedCategories.length === 0 ? (
              <div className="py-8 text-center text-xs font-bold text-muted">
                No categories found for the selected view.
              </div>
            ) : (
              <div className="divide-y-2 divide-border">
                {displayedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-btn bg-surface-subtle border-2 border-border flex items-center justify-center text-lg shrink-0">
                        {getCategoryIconSymbol(cat.icon)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-ink font-extrabold text-sm truncate">
                            {cat.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-pill border border-border text-[10px] font-extrabold ${
                              cat.kind === "income"
                                ? "bg-neo-green/30 text-ink"
                                : "bg-neo-coral/30 text-ink"
                            }`}
                          >
                            {cat.kind === "income" ? "+ Income" : "- Expense"}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-muted mt-0.5">
                          {cat.isDefault ? "Default Shared Category" : "Custom Category"}
                          {cat.isArchived && " [Archived]"}
                          {cat.isHidden && " [Hidden]"}
                        </div>
                      </div>
                    </div>

                    {/* CATEGORY ROW ACTIONS */}
                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto shrink-0">
                      {cat.isDefault ? (
                        <Button
                          type="button"
                          variant="quiet"
                          size="sm"
                          onClick={() => handleToggleHideDefault(cat)}
                          disabled={loading}
                        >
                          {cat.isHidden ? "Unhide Default" : "Hide Default"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => handleOpenEdit(cat)}
                            disabled={loading}
                          >
                            Rename
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => handleOpenMerge(cat)}
                            disabled={loading}
                          >
                            Merge
                          </Button>
                          <Button
                            type="button"
                            variant="quiet"
                            size="sm"
                            onClick={() => handleToggleArchive(cat)}
                            disabled={loading}
                          >
                            {cat.isArchived ? "Restore" : "Archive"}
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={loading}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACCOUNTS SUMMARY & PROMOTION (col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-4">
            <div className="flex items-center justify-between border-b-2 border-border pb-3">
              <h2 className="text-base font-extrabold text-ink">
                Accounts & Wallets
              </h2>
              <Link
                href="/accounts"
                className="text-xs font-black text-accent hover:underline"
              >
                Full View →
              </Link>
            </div>

            <p className="text-xs text-muted font-medium leading-relaxed">
              Accounts track liquid assets, banks, and cards. Current balances are computed live from opening balance, transactions, and transfers.
            </p>

            <Link href="/accounts" className="block">
              <Button variant="primary" size="md" className="w-full">
                Open Accounts Manager →
              </Button>
            </Link>

            <div className="rounded-card border-2 border-border bg-surface-subtle/50 p-2 max-h-72 overflow-y-auto divide-y-2 divide-border">
              {wallets.length === 0 ? (
                <div className="p-3 text-center text-xs font-bold text-muted">
                  No accounts created yet.
                </div>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className="py-2.5 px-3 flex items-center justify-between text-xs font-bold"
                  >
                    <div>
                      <span className="text-ink font-extrabold block">{w.name}</span>
                      <span className="text-[10px] font-mono text-muted uppercase">
                        {w.type.replace("_", " ")} {w.isDefault ? "★ Default" : ""}
                      </span>
                    </div>
                    {w.currentBalanceMinor !== undefined && (
                      <span className="font-mono font-black text-ink">
                        {w.currentBalanceMinor < 0 ? "-" : "+"}
                        {formatMoney(Math.abs(w.currentBalanceMinor), w.currency || userCurrency)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT / RENAME CATEGORY MODAL */}
      <Dialog
        isOpen={!!editingCat}
        onClose={() => setEditingCat(null)}
        title="Edit Category"
        description="Update category name and icon."
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Field label="Category Name" required>
            <Input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </Field>

          <Field label="Kind" required>
            <Select
              value={editKind}
              onChange={(e) => setEditKind(e.target.value as "income" | "expense")}
              required
            >
              <option value="expense">Expense (-)</option>
              <option value="income">Income (+)</option>
            </Select>
          </Field>

          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-muted block mb-2">
              Choose Icon
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {CATEGORY_ICON_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEditIcon(item.id)}
                  className={`h-10 rounded-btn border-2 text-base flex items-center justify-center transition-all ${
                    editIcon === item.id
                      ? "bg-neo-yellow border-border shadow-neo-sm scale-105"
                      : "bg-surface-subtle border-border/40 hover:border-border text-ink"
                  }`}
                  title={item.label}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t-2 border-border">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setEditingCat(null)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MERGE CATEGORY MODAL */}
      <Dialog
        isOpen={!!mergeSource}
        onClose={() => setMergeSource(null)}
        title="Merge Category"
        description={`Reassign all transactions from "${mergeSource?.name}" into another category atomically.`}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted leading-relaxed">
            All historical transactions belonging to <strong>{mergeSource?.name}</strong> will be moved to the destination category below. If this was a custom category, it will then be safely deleted.
          </p>

          <Field label="Destination Category" required>
            <Select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              required
            >
              <option value="">Select target category...</option>
              {categories
                .filter(
                  (c) =>
                    c.id !== mergeSource?.id &&
                    c.kind === mergeSource?.kind &&
                    !c.isArchived &&
                    !c.isHidden
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryIconSymbol(c.icon)} {c.name} ({c.kind})
                  </option>
                ))}
            </Select>
          </Field>

          <div className="flex gap-2.5 justify-end pt-3 border-t-2 border-border">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setMergeSource(null)}
              disabled={mergeSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmMerge}
              disabled={mergeSubmitting || !mergeTargetId}
            >
              {mergeSubmitting ? "Merging..." : "Confirm Atomic Merge"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DELETE BLOCKED MODAL (Transactions exist -> offer Archive or Merge) */}
      <Dialog
        isOpen={!!deleteBlockedCat}
        onClose={() => setDeleteBlockedCat(null)}
        title="Category Has Transactions"
        description="Deleting categories with existing transactions is blocked to prevent data loss."
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-muted leading-relaxed">
            The category <strong>&quot;{deleteBlockedCat?.name}&quot;</strong> has active transactions in your ledger. You can either <strong>Archive</strong> it to hide it from new entries, or <strong>Merge</strong> all its transactions into another category.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => {
                const target = deleteBlockedCat;
                setDeleteBlockedCat(null);
                if (target) handleOpenMerge(target);
              }}
            >
              Merge into Another Category
            </Button>
            <Button
              type="button"
              variant="cyan"
              size="md"
              className="flex-1"
              onClick={() => {
                const target = deleteBlockedCat;
                setDeleteBlockedCat(null);
                if (target) handleToggleArchive(target);
              }}
            >
              Archive Category
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

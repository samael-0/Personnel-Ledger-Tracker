"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { type Category, type Wallet } from "./TransactionSheet";

interface CategoryWalletManagerProps {
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
  onRefresh: () => void;
}

export function CategoryWalletManager({
  categories,
  wallets,
  userCurrency,
  onRefresh,
}: CategoryWalletManagerProps) {
  const [newCatName, setNewCatName] = React.useState("");
  const [newCatKind, setNewCatKind] = React.useState<"income" | "expense">("expense");
  const [newWalName, setNewWalName] = React.useState("");
  const [newWalType, setNewWalType] = React.useState<"cash" | "bank" | "mobile_wallet" | "other">("bank");
  const [loadingCat, setLoadingCat] = React.useState(false);
  const [loadingWal, setLoadingWal] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setLoadingCat(true);
    setMessage(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), kind: newCatKind }),
      });
      if (!res.ok) throw new Error("Failed to add category");
      setNewCatName("");
      setMessage("Category registered successfully.");
      onRefresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error creating category");
    } finally {
      setLoadingCat(false);
    }
  }

  async function handleAddWallet(e: React.FormEvent) {
    e.preventDefault();
    if (!newWalName.trim()) return;
    setLoadingWal(true);
    setMessage(null);

    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWalName.trim(),
          type: newWalType,
          currency: userCurrency,
        }),
      });
      if (!res.ok) throw new Error("Failed to add wallet");
      setNewWalName("");
      setMessage("Wallet account registered successfully.");
      onRefresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error creating wallet");
    } finally {
      setLoadingWal(false);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="p-3.5 rounded-btn bg-neo-yellow/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CATEGORIES MANAGEMENT */}
        <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink border-b-2 border-border pb-3 mb-4">
              Categories
            </h2>

            <form onSubmit={handleAddCategory} className="space-y-3 mb-6">
              <Field label="New Category Name">
                <Input
                  type="text"
                  placeholder="e.g. Freelance Client, Subscriptions"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  disabled={loadingCat}
                />
              </Field>
              <div className="flex gap-2">
                <Select
                  value={newCatKind}
                  onChange={(e) =>
                    setNewCatKind(e.target.value as "income" | "expense")
                  }
                  className="flex-1"
                  disabled={loadingCat}
                >
                  <option value="expense">Expense (-)</option>
                  <option value="income">Income (+)</option>
                </Select>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={loadingCat}
                >
                  + Add
                </Button>
              </div>
            </form>

            <div className="rounded-card border-2 border-border bg-surface-subtle/50 p-2 max-h-64 overflow-y-auto divide-y-2 divide-border">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="py-2.5 px-3 flex items-center justify-between text-xs font-bold"
                >
                  <span className="text-ink">{c.name}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-pill border border-border text-[10px] font-extrabold shadow-neo-sm ${
                      c.kind === "income"
                        ? "bg-neo-green text-ink"
                        : "bg-neo-coral text-ink"
                    }`}
                  >
                    {c.kind === "income" ? "Income (+)" : "Expense (-)"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* WALLETS MANAGEMENT */}
        <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink border-b-2 border-border pb-3 mb-4">
              Wallets & Accounts
            </h2>

            <form onSubmit={handleAddWallet} className="space-y-3 mb-6">
              <Field label="New Wallet Name">
                <Input
                  type="text"
                  placeholder="e.g. Petty Cash, Chase Checking"
                  value={newWalName}
                  onChange={(e) => setNewWalName(e.target.value)}
                  disabled={loadingWal}
                />
              </Field>
              <div className="flex gap-2">
                <Select
                  value={newWalType}
                  onChange={(e) =>
                    setNewWalType(
                      e.target.value as "cash" | "bank" | "mobile_wallet" | "other"
                    )
                  }
                  className="flex-1"
                  disabled={loadingWal}
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Physical Cash</option>
                  <option value="mobile_wallet">Mobile Wallet</option>
                  <option value="other">Other Account</option>
                </Select>
                <Button
                  type="submit"
                  variant="cyan"
                  size="sm"
                  disabled={loadingWal}
                >
                  + Add
                </Button>
              </div>
            </form>

            <div className="rounded-card border-2 border-border bg-surface-subtle/50 p-2 max-h-64 overflow-y-auto divide-y-2 divide-border">
              {wallets.map((w) => (
                <div
                  key={w.id}
                  className="py-2.5 px-3 flex items-center justify-between text-xs font-bold"
                >
                  <span className="text-ink">{w.name}</span>
                  <span className="px-2.5 py-0.5 rounded-pill bg-white dark:bg-zinc-800 border border-border text-[10px] font-mono font-bold text-muted shadow-neo-sm">
                    {w.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

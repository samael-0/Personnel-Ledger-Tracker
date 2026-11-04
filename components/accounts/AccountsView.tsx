"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { formatMoney, parseToMinorUnits, SUPPORTED_CURRENCIES } from "@/lib/money";

export interface AccountItem {
  id: string;
  name: string;
  type: string;
  currency: string;
  openingBalanceMinor: number;
  isDefault: boolean;
  isArchived: boolean;
  sortOrder: number;
  accountNumberLast4?: string | null;
  note?: string | null;
  currentBalanceMinor: number;
}

interface AccountsViewProps {
  initialAccounts: AccountItem[];
  userCurrency: string;
}

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account" },
  { value: "cash", label: "Cash / Wallet" },
  { value: "mobile_wallet", label: "Mobile Wallet (eSewa / Venmo)" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "other", label: "Other Asset" },
];

export function AccountsView({ initialAccounts, userCurrency }: AccountsViewProps) {
  const router = useRouter();
  const [accounts, setAccounts] = React.useState<AccountItem[]>(initialAccounts);
  const [filterArchived, setFilterArchived] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Modal form states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<AccountItem | null>(null);
  const [formName, setFormName] = React.useState("");
  const [formType, setFormType] = React.useState("bank");
  const [formCurrency, setFormCurrency] = React.useState(userCurrency);
  const [formOpeningBalance, setFormOpeningBalance] = React.useState("0");
  const [formIsDefault, setFormIsDefault] = React.useState(false);
  const [formLast4, setFormLast4] = React.useState("");
  const [formNote, setFormNote] = React.useState("");
  const [formSubmitting, setFormSubmitting] = React.useState(false);

  // Refresh data from API
  const refreshAccounts = React.useCallback(async () => {
    try {
      const res = await fetch("/api/wallets?includeArchived=true");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.wallets || []);
      }
    } catch (err) {
      console.error("Failed to refresh accounts:", err);
    }
  }, []);

  function handleOpenCreateModal() {
    setEditingAccount(null);
    setFormName("");
    setFormType("bank");
    setFormCurrency(userCurrency);
    setFormOpeningBalance("0");
    setFormIsDefault(accounts.length === 0);
    setFormLast4("");
    setFormNote("");
    setIsModalOpen(true);
  }

  function handleOpenEditModal(acc: AccountItem) {
    setEditingAccount(acc);
    setFormName(acc.name);
    setFormType(acc.type);
    setFormCurrency(acc.currency || userCurrency);
    setFormOpeningBalance((acc.openingBalanceMinor / 100).toString());
    setFormIsDefault(acc.isDefault);
    setFormLast4(acc.accountNumberLast4 || "");
    setFormNote(acc.note || "");
    setIsModalOpen(true);
  }

  async function handleQuickStarterCash() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Cash",
          type: "cash",
          currency: userCurrency,
          openingBalanceMinor: 0,
          isDefault: true,
          note: "Default physical cash wallet",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create Cash account");
      setMessage({ text: "Cash account created successfully.", type: "success" });
      await refreshAccounts();
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error creating Cash account",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setMessage({ text: "Please provide an account name.", type: "error" });
      return;
    }

    setFormSubmitting(true);
    setMessage(null);

    const openingMinor = parseToMinorUnits(formOpeningBalance, formCurrency);

    try {
      if (editingAccount) {
        // Edit existing
        const res = await fetch("/api/wallets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAccount.id,
            name: formName.trim(),
            type: formType,
            currency: formCurrency,
            openingBalanceMinor: openingMinor,
            isDefault: formIsDefault,
            accountNumberLast4: formLast4.trim() ? formLast4.trim().slice(-4) : null,
            note: formNote.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update account");
        setMessage({ text: "Account updated successfully.", type: "success" });
      } else {
        // Create new
        const res = await fetch("/api/wallets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            type: formType,
            currency: formCurrency,
            openingBalanceMinor: openingMinor,
            isDefault: formIsDefault,
            accountNumberLast4: formLast4.trim() ? formLast4.trim().slice(-4) : null,
            note: formNote.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create account");
        setMessage({ text: "Account created successfully.", type: "success" });
      }

      setIsModalOpen(false);
      await refreshAccounts();
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error saving account",
        type: "error",
      });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleArchiveToggle(acc: AccountItem) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wallets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: acc.id,
          isArchived: !acc.isArchived,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle archive status");
      setMessage({
        text: acc.isArchived ? "Account restored to active accounts." : "Account archived.",
        type: "success",
      });
      await refreshAccounts();
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error updating account",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefault(acc: AccountItem) {
    if (acc.isDefault || acc.isArchived) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/wallets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: acc.id,
          isDefault: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set default account");
      setMessage({ text: `${acc.name} is now your default account.`, type: "success" });
      await refreshAccounts();
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error updating default account",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(acc: AccountItem) {
    if (!confirm(`Permanently delete account "${acc.name}"? If it has transactions, archive it instead.`)) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/wallets?id=${acc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account");
      }
      setMessage({ text: "Account deleted permanently.", type: "success" });
      await refreshAccounts();
      router.refresh();
    } catch (err: unknown) {
      setMessage({
        text: err instanceof Error ? err.message : "Error deleting account",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // Calculate totals grouped strictly by currency (never add different currencies together)
  const totalsByCurrency: Record<string, number> = {};
  for (const acc of accounts) {
    if (!acc.isArchived) {
      const cur = acc.currency || userCurrency;
      totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + acc.currentBalanceMinor;
    }
  }

  const displayedAccounts = accounts.filter((a) => (filterArchived ? a.isArchived : !a.isArchived));

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
            Accounts & Balances
          </h1>
          <p className="text-xs font-medium text-muted mt-0.5">
            Manage your bank accounts, cash, and digital wallets. Current balances are computed live.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleOpenCreateModal}
          disabled={loading}
          className="shrink-0"
        >
          + Add Account
        </Button>
      </div>

      {/* STATUS MESSAGE */}
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

      {/* TOTALS GROUPED STRICTLY BY CURRENCY */}
      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-muted block">
            Net Total by Currency
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(totalsByCurrency).map(([cur, totalMinor]) => (
              <div
                key={cur}
                className="bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm flex items-center justify-between"
              >
                <div>
                  <span className="text-[11px] font-mono font-bold text-muted uppercase">
                    {cur} Balance
                  </span>
                  <div className="text-xl font-black font-mono text-ink mt-0.5">
                    {totalMinor < 0 ? "-" : "+"}
                    {formatMoney(Math.abs(totalMinor), cur)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-neo-yellow/30 border-2 border-border flex items-center justify-center font-black text-sm">
                  {cur}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIRST-RUN PROMPT IF USER HAS NO ACCOUNTS */}
      {accounts.length === 0 && (
        <div className="bg-surface rounded-card border-2 border-border p-8 text-center shadow-neo-sm space-y-4">
          <div className="w-14 h-14 rounded-full bg-neo-yellow border-2 border-border flex items-center justify-center mx-auto text-2xl font-black shadow-neo-sm">
            🏦
          </div>
          <div>
            <h2 className="text-base font-extrabold text-ink">
              No Accounts Configured Yet
            </h2>
            <p className="text-xs text-muted font-medium max-w-sm mx-auto mt-1 leading-relaxed">
              Every expense, income, and transfer is tracked in an account. Get started with a starter Cash account or add a custom bank account.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleQuickStarterCash}
              disabled={loading}
            >
              ⚡ Quick Cash Starter
            </Button>
            <Button
              type="button"
              variant="cyan"
              size="md"
              onClick={handleOpenCreateModal}
              disabled={loading}
            >
              + Custom Account
            </Button>
          </div>
        </div>
      )}

      {/* ACCOUNTS LIST FILTER TABS */}
      {accounts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-border pb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFilterArchived(false)}
                className={`px-3 py-1.5 rounded-btn text-xs font-black border-2 transition-all ${
                  !filterArchived
                    ? "bg-neo-yellow text-ink border-border shadow-neo-sm"
                    : "bg-surface text-muted border-transparent hover:border-border"
                }`}
              >
                Active Accounts ({accounts.filter((a) => !a.isArchived).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterArchived(true)}
                className={`px-3 py-1.5 rounded-btn text-xs font-black border-2 transition-all ${
                  filterArchived
                    ? "bg-neo-yellow text-ink border-border shadow-neo-sm"
                    : "bg-surface text-muted border-transparent hover:border-border"
                }`}
              >
                Archived ({accounts.filter((a) => a.isArchived).length})
              </button>
            </div>
          </div>

          {displayedAccounts.length === 0 ? (
            <div className="bg-surface rounded-card border-2 border-border p-8 text-center text-xs font-bold text-muted shadow-neo-sm">
              {filterArchived ? "No archived accounts found." : "No active accounts found."}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm flex flex-col justify-between transition-all ${
                    acc.isArchived ? "opacity-75 bg-surface-subtle" : ""
                  }`}
                >
                  <div>
                    {/* TOP BADGES */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-pill bg-surface-subtle border border-border text-ink">
                        {acc.type.replace("_", " ")}
                      </span>
                      {acc.isDefault && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-pill bg-neo-yellow border border-border text-ink shadow-neo-sm">
                          ★ Default
                        </span>
                      )}
                    </div>

                    {/* NAME & LAST 4 */}
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-extrabold text-ink truncate">
                        {acc.name}
                      </h3>
                      {acc.accountNumberLast4 && (
                        <span className="text-xs font-mono font-bold text-muted">
                          •••• {acc.accountNumberLast4}
                        </span>
                      )}
                    </div>

                    {acc.note && (
                      <p className="text-xs text-muted font-medium mt-1 line-clamp-1">
                        {acc.note}
                      </p>
                    )}

                    {/* BALANCES */}
                    <div className="mt-4 pt-3 border-t-2 border-border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-muted">
                          Current Balance:
                        </span>
                        <span
                          className={`text-lg font-black font-mono ${
                            acc.currentBalanceMinor < 0
                              ? "text-neo-coral"
                              : "text-ink"
                          }`}
                        >
                          {acc.currentBalanceMinor < 0 ? "-" : "+"}
                          {formatMoney(Math.abs(acc.currentBalanceMinor), acc.currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-muted">
                        <span>Opening:</span>
                        <span>
                          {acc.openingBalanceMinor < 0 ? "-" : ""}
                          {formatMoney(Math.abs(acc.openingBalanceMinor), acc.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4 pt-3 border-t-2 border-border flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => handleOpenEditModal(acc)}
                      disabled={loading}
                    >
                      Edit
                    </Button>

                    {!acc.isDefault && !acc.isArchived && (
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() => handleSetDefault(acc)}
                        disabled={loading}
                        title="Set as default account for transactions"
                      >
                        Set Default
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant={acc.isArchived ? "primary" : "quiet"}
                      size="sm"
                      onClick={() => handleArchiveToggle(acc)}
                      disabled={loading}
                    >
                      {acc.isArchived ? "Restore" : "Archive"}
                    </Button>

                    {acc.isArchived && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(acc)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT DIALOG */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? "Edit Account" : "Create New Account"}
        description="Configure account details, currency, and opening balance."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field label="Account Name" required>
            <Input
              type="text"
              placeholder="e.g. Chase Checking, eSewa, Pocket Cash"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Account Type" required>
              <Select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                required
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Currency" required>
              <Select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                required
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Opening Balance"
              description="Starting amount before recorded transactions (negative for credit cards)"
              required
            >
              <Input
                type="text"
                placeholder="0.00"
                value={formOpeningBalance}
                onChange={(e) => setFormOpeningBalance(e.target.value)}
                required
              />
            </Field>

            <Field label="Last 4 Digits (Optional)">
              <Input
                type="text"
                maxLength={4}
                placeholder="e.g. 4821"
                value={formLast4}
                onChange={(e) => setFormLast4(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Optional Note">
            <Input
              type="text"
              placeholder="e.g. Primary salary bank account"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isDefaultCheckbox"
              checked={formIsDefault}
              onChange={(e) => setFormIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-border accent-ink cursor-pointer"
            />
            <label
              htmlFor="isDefaultCheckbox"
              className="text-xs font-bold text-ink cursor-pointer select-none"
            >
              Set as default account (preselected in new transactions)
            </label>
          </div>

          <div className="flex gap-2.5 justify-end pt-3 border-t-2 border-border">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsModalOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={formSubmitting}
            >
              {formSubmitting
                ? "Saving..."
                : editingAccount
                ? "Update Account"
                : "Create Account"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}


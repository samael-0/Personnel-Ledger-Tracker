"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { SUPPORTED_CURRENCIES } from "@/lib/money";
import { useTheme } from "@/components/ThemeProvider";

interface ProfileViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    currency: string;
    image?: string | null;
    saveReceiptPhotosDefault?: boolean;
  };
  initialStorageStats?: {
    count: number;
    totalBytes: number;
  };
}

export function ProfileView({ user, initialStorageStats = { count: 0, totalBytes: 0 } }: ProfileViewProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [name, setName] = React.useState(user.name);
  const [currency, setCurrency] = React.useState(user.currency || "USD");
  const [image, setImage] = React.useState<string | null>(user.image || null);
  const [saveReceiptPhotosDefault, setSaveReceiptPhotosDefault] = React.useState(
    user.saveReceiptPhotosDefault ?? false
  );
  const [storageStats, setStorageStats] = React.useState(initialStorageStats);
  const [loading, setLoading] = React.useState(false);
  const [deletingReceipts, setDeletingReceipts] = React.useState(false);
  const [isDeleteReceiptsOpen, setIsDeleteReceiptsOpen] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setStatusMsg({
        type: "error",
        text: "Avatar image must be under 2MB in size.",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currency,
          image,
          saveReceiptPhotosDefault,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setStatusMsg({
        type: "success",
        text: "Profile preferences saved successfully.",
      });
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error saving profile";
      setStatusMsg({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAllReceipts() {
    setDeletingReceipts(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/user/receipts", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete receipts");
      }

      setStorageStats({ count: 0, totalBytes: 0 });
      setIsDeleteReceiptsOpen(false);
      setStatusMsg({
        type: "success",
        text: "All saved receipt photos have been deleted. Transactions remain untouched.",
      });
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error deleting receipts";
      setStatusMsg({ type: "error", text: message });
    } finally {
      setDeletingReceipts(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== "DELETE") return;
    setLoading(true);

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      await signOut();
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error deleting account";
      setStatusMsg({ type: "error", text: message });
      setLoading(false);
    }
  }

  const formattedStorage =
    storageStats.totalBytes > 1024 * 1024
      ? `${(storageStats.totalBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(storageStats.totalBytes / 1024)} KB`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-btn bg-neo-yellow text-ink border-2 border-border flex items-center justify-center text-xl font-extrabold shrink-0 overflow-hidden shadow-neo-sm">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              (name[0] || "U").toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-ink">
              User Profile & Settings
            </h1>
            <p className="text-xs font-mono font-bold text-muted mt-0.5">
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-btn text-xs font-bold border-2 border-border shadow-neo-sm ${
            statusMsg.type === "success"
              ? "bg-neo-green/20 text-ink"
              : "bg-neo-coral/20 text-ink"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* APPEARANCE & THEME TOGGLE */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-4">
        <div className="border-b-2 border-border pb-3">
          <h2 className="text-sm font-extrabold text-ink">
            Interface Appearance
          </h2>
          <p className="text-xs font-medium text-muted mt-0.5">
            Switch between light, dark, or system preference
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 p-1.5 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`py-2 text-xs font-extrabold rounded-control transition-all capitalize select-none ${
                theme === t
                  ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* EDIT PROFILE FORM */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm">
        <h2 className="text-sm font-extrabold text-ink border-b-2 border-border pb-3 mb-5">
          General Preferences
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <span className="text-xs font-bold text-ink block mb-2">
              Profile Avatar
            </span>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="cyan"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Photo
              </Button>
              {image && (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => setImage(null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          <Field label="Display Name" required>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </Field>

          <Field
            label="Base Currency"
            description="All balances and summaries will calculate in this denomination."
            required
          >
            <Select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={loading}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol}) - {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {/* RECEIPT PHOTO DEFAULT PREFERENCE */}
          <div className="pt-1">
            <label className="flex items-start gap-3 p-3.5 bg-surface-subtle border-2 border-border rounded-btn cursor-pointer shadow-neo-sm select-none hover:bg-surface transition-colors">
              <input
                type="checkbox"
                checked={saveReceiptPhotosDefault}
                onChange={(e) => setSaveReceiptPhotosDefault(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-2 border-border text-primary accent-primary focus:ring-2 focus:ring-border focus:ring-offset-2"
              />
              <div>
                <span className="text-xs font-black text-ink block">
                  Save scanned receipt photos by default
                </span>
                <span className="text-[11px] text-muted font-medium block mt-0.5">
                  When scanning receipts with camera or file, automatically check &quot;Save receipt photo with this transaction&quot;. You can still toggle it per scan.
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? "Saving Changes..." : "Save Preferences"}
            </Button>
          </div>
        </form>
      </div>

      {/* RECEIPT STORAGE MANAGEMENT */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-4">
        <div className="border-b-2 border-border pb-3">
          <h2 className="text-sm font-extrabold text-ink">
            Receipt Photo Storage
          </h2>
          <p className="text-xs font-medium text-muted mt-0.5">
            Monitor and control storage usage of receipt attachments
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm">
            <span className="text-[10px] font-extrabold text-muted uppercase block">
              Photos Saved
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-ink">
              {storageStats.count} {storageStats.count === 1 ? "photo" : "photos"}
            </span>
          </div>

          <div className="p-3 bg-surface-subtle border-2 border-border rounded-btn shadow-neo-sm">
            <span className="text-[10px] font-extrabold text-muted uppercase block">
              Total Database Size
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-ink">
              {formattedStorage}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-btn bg-surface-subtle border-2 border-border text-[11px] text-muted font-medium leading-relaxed">
          <span className="font-bold text-ink">Free Tier Note: </span>
          Receipt photos are stored directly in your PostgreSQL database (Postgres bytea) without external cloud S3 buckets. You can delete photos at any time to reclaim database quota; all financial transaction numbers, dates, categories, and accounts remain completely intact.
        </div>

        {storageStats.count > 0 && (
          <div className="pt-1">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setIsDeleteReceiptsOpen(true)}
              className="text-danger hover:text-danger hover:border-danger"
            >
              Delete All Saved Receipt Photos
            </Button>
          </div>
        )}
      </div>

      {/* FINANCE CONFIGURATION */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-4">
        <h2 className="text-sm font-extrabold text-ink border-b-2 border-border pb-3">
          Finance Management
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/accounts"
            className="p-3.5 rounded-btn border-2 border-border bg-surface-subtle hover:bg-neo-yellow/20 transition-all flex items-center justify-between shadow-neo-sm"
          >
            <div>
              <span className="text-xs font-black text-ink block">Accounts & Balances</span>
              <span className="text-[11px] text-muted font-medium">Banks, cash, and digital cards</span>
            </div>
            <span className="text-base font-black text-ink">→</span>
          </Link>
          <Link
            href="/transactions?tab=meta"
            className="p-3.5 rounded-btn border-2 border-border bg-surface-subtle hover:bg-neo-cyan/20 transition-all flex items-center justify-between shadow-neo-sm"
          >
            <div>
              <span className="text-xs font-black text-ink block">Custom Categories</span>
              <span className="text-[11px] text-muted font-medium">Icons, merge, and hide defaults</span>
            </div>
            <span className="text-base font-black text-ink">→</span>
          </Link>
        </div>
      </div>

      {/* DATA EXPORT */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-3">
        <h2 className="text-sm font-extrabold text-ink border-b-2 border-border pb-3">
          Data Export
        </h2>
        <p className="text-xs font-medium text-muted leading-relaxed">
          Download your complete financial transaction ledger as an unencrypted
          UTF-8 CSV file for external auditing or offline backups.
        </p>
        <div className="pt-1">
          <a href="/api/user/export" download>
            <Button variant="cyan" size="md">
              Export Transactions (.CSV)
            </Button>
          </a>
        </div>
      </div>

      {/* SESSION & DANGER ZONE */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm space-y-6">
        <div>
          <h2 className="text-sm font-extrabold text-ink border-b-2 border-border pb-3 mb-3">
            Session
          </h2>
          <Button variant="neutral" onClick={handleSignOut}>
            Sign Out of Ledgerly
          </Button>
        </div>

        <div className="border-t-2 border-border pt-5">
          <h2 className="text-sm font-extrabold text-danger pb-1">
            Danger Zone
          </h2>
          <p className="text-xs font-medium text-muted mb-4 leading-relaxed">
            Permanently delete your user account, transaction records, scanned
            receipts, and stored QR codes. This action cannot be reversed.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete Account Permanently
          </Button>
        </div>
      </div>

      {/* DELETE ALL RECEIPTS DIALOG */}
      <Dialog
        isOpen={isDeleteReceiptsOpen}
        onClose={() => setIsDeleteReceiptsOpen(false)}
        title="Delete All Receipt Photos?"
        description="This will purge all stored receipt image bytes from your database."
      >
        <div className="space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            All your transaction details (merchants, categories, amounts, dates, and accounts) will remain 100% intact. Only the attached photo images will be deleted.
          </p>
          <div className="flex gap-2.5 justify-end pt-2">
            <Button
              variant="quiet"
              onClick={() => setIsDeleteReceiptsOpen(false)}
              disabled={deletingReceipts}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deletingReceipts}
              onClick={handleDeleteAllReceipts}
            >
              {deletingReceipts ? "Purging Photos..." : "Confirm Delete Photos"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DELETE ACCOUNT DIALOG */}
      <Dialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        title="Confirm Account Deletion"
        description="Type DELETE below to confirm destruction of all ledger data."
      >
        <div className="space-y-4">
          <Field label="Type 'DELETE' to confirm">
            <Input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
            />
          </Field>
          <div className="flex gap-2.5 justify-end pt-2">
            <Button
              variant="quiet"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmation !== "DELETE" || loading}
              onClick={handleDeleteAccount}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

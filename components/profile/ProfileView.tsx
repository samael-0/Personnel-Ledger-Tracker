"use client";

import * as React from "react";
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
  };
}

export function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [name, setName] = React.useState(user.name);
  const [currency, setCurrency] = React.useState(user.currency || "USD");
  const [image, setImage] = React.useState<string | null>(user.image || null);
  const [loading, setLoading] = React.useState(false);
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
        body: JSON.stringify({ name, currency, image }),
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

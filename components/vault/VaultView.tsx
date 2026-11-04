"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { decodeQrFromImage } from "@/lib/qr-client";

export interface QrRecord {
  id: string;
  name: string;
  category: "payment" | "person" | "business";
  note?: string | null;
  decodedText?: string | null;
  isPinned: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

interface VaultViewProps {
  initialQrCodes: QrRecord[];
}

export function VaultView({ initialQrCodes }: VaultViewProps) {
  const [items, setItems] = React.useState<QrRecord[]>(initialQrCodes);
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState<string>("all");

  // Sheet states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<QrRecord | null>(null);

  // Full-screen viewer for scanning off phone screen
  const [viewingItem, setViewingItem] = React.useState<QrRecord | null>(null);

  // Add form states
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState<"payment" | "person" | "business">("payment");
  const [note, setNote] = React.useState("");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [decodedData, setDecodedData] = React.useState<string | null>(null);
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const fetchItems = React.useCallback(async () => {
    try {
      const res = await fetch("/api/qr");
      if (res.ok) {
        const data = await res.json();
        setItems(data.qrCodes || []);
      }
    } catch (e) {
      console.error("Failed to load QR vault", e);
    }
  }, []);

  async function handleFile(file: File) {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsDecoding(true);
    setDecodedData(null);

    const decoded = await decodeQrFromImage(file);
    setDecodedData(decoded);
    setIsDecoding(false);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!selectedFile) {
      setError("Please select or capture a QR code image");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category", category);
      if (note.trim()) formData.append("note", note.trim());
      if (decodedData) formData.append("decodedText", decodedData);
      formData.append("file", selectedFile);

      const res = await fetch("/api/qr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save QR code");

      setIsAddOpen(false);
      resetAddForm();
      fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving QR code";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  function resetAddForm() {
    setName("");
    setCategory("payment");
    setNote("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setDecodedData(null);
    setError(null);
  }

  async function handleTogglePin(item: QrRecord, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch("/api/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          category: item.category,
          note: item.note,
          decodedText: item.decodedText,
          isPinned: !item.isPinned,
        }),
      });
      fetchItems();
    } catch (e) {
      console.error("Failed to toggle pin", e);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    setSaving(true);
    try {
      const res = await fetch("/api/qr", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      if (!res.ok) throw new Error("Failed to update QR code");
      setIsEditOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: QrRecord) {
    if (!confirm(`Delete "${item.name}" from your QR vault?`)) return;
    try {
      await fetch(`/api/qr?id=${item.id}`, { method: "DELETE" });
      setIsEditOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  const filteredItems = items
    .filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.note && item.note.toLowerCase().includes(search.toLowerCase())) ||
        (item.decodedText && item.decodedText.toLowerCase().includes(search.toLowerCase()));
      const matchCat = catFilter === "all" || item.category === catFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 sm:p-6 rounded-card border-2 border-border shadow-neo">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
            QR Vault
          </h1>
          <p className="text-xs font-medium text-muted mt-0.5">
            Store payment and personal QR codes offline. Tap to present at high contrast.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            resetAddForm();
            setIsAddOpen(true);
          }}
          className="self-start sm:self-auto"
        >
          + Store QR Code
        </Button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <Input
            type="text"
            placeholder="Search code name, note, or decoded link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="payment">Payment Codes</option>
            <option value="person">Personal / ID</option>
            <option value="business">Business / Merchant</option>
          </Select>
        </div>
      </div>

      {/* TILES GRID */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="QR Vault Empty"
          description="Save payment QR codes, merchant codes, or passes to present them instantly at checkout counters."
          actionLabel="+ Add First QR Code"
          onAction={() => {
            resetAddForm();
            setIsAddOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingItem(item)}
              className="bg-surface rounded-card border-2 border-border shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* TILE HEADER */}
                <div className="border-b-2 border-border bg-surface-subtle/50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold bg-neo-yellow/30 border border-border text-ink px-2.5 py-0.5 rounded-pill capitalize shadow-neo-sm">
                      {item.category}
                    </span>
                    {item.isPinned && (
                      <span className="text-[10px] font-extrabold bg-neo-yellow text-ink border border-border px-2 py-0.5 rounded-pill shadow-neo-sm">
                        Pinned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(item, e)}
                      title={item.isPinned ? "Unpin" : "Pin to top"}
                      className="text-xs px-2 py-1 rounded-control font-bold text-muted hover:text-ink hover:bg-surface border border-transparent hover:border-border"
                    >
                      {item.isPinned ? "★" : "☆"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setIsEditOpen(true);
                      }}
                      className="text-xs px-2 py-1 rounded-control text-muted hover:text-ink hover:bg-surface font-bold border border-transparent hover:border-border"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* TILE BODY */}
                <div className="p-4 flex gap-3.5 items-center">
                  <div className="w-16 h-16 bg-white rounded-btn border-2 border-border shrink-0 p-1 flex items-center justify-center overflow-hidden shadow-neo-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${item.id}/image`}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-extrabold text-ink truncate group-hover:text-accent transition-colors">
                      {item.name}
                    </h2>
                    {item.note && (
                      <p className="text-xs text-muted truncate mt-0.5 font-medium">
                        {item.note}
                      </p>
                    )}
                    {item.decodedText && (
                      <p className="text-[10px] font-mono font-bold text-muted truncate mt-1 bg-surface-subtle border border-border rounded-control px-2 py-0.5">
                        {item.decodedText}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* TILE FOOTER */}
              <div className="border-t-2 border-border px-4 py-2.5 bg-surface-subtle/30 flex justify-between items-center text-[11px] font-bold text-muted">
                <span>Tap to Present Fullscreen</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN HIGH CONTRAST SCANNING VIEW */}
      <Dialog
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        title={viewingItem?.name || "QR Code"}
        description="High-contrast display for optical pickup at checkout."
        variant="modal"
      >
        {viewingItem && (
          <div className="space-y-4">
            {/* PURE WHITE BOX FOR HIGHEST OPTICAL CONTRAST */}
            <div className="bg-white rounded-card border-2 border-border p-6 flex flex-col items-center justify-center shadow-neo">
              <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${viewingItem.id}/image`}
                  alt={viewingItem.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mt-4 text-center">
                {viewingItem.name}
              </h3>
              {viewingItem.note && (
                <p className="text-xs font-semibold text-slate-600 text-center mt-1">
                  {viewingItem.note}
                </p>
              )}
            </div>

            {viewingItem.decodedText && (
              <div className="rounded-btn border-2 border-border bg-surface-subtle p-3 space-y-1 shadow-neo-sm">
                <span className="text-[10px] font-extrabold text-muted uppercase">
                  Decoded Content:
                </span>
                <p className="text-xs font-mono font-bold text-ink break-all select-all">
                  {viewingItem.decodedText}
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="neutral"
                size="sm"
                onClick={() => {
                  setEditingItem(viewingItem);
                  setViewingItem(null);
                  setIsEditOpen(true);
                }}
              >
                Edit Details
              </Button>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setViewingItem(null)}
              >
                Close View
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ADD QR DIALOG */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Store QR Code"
        description="Save code image with client-side decoding."
        variant="sheet"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-neo-coral/20 text-ink font-bold text-xs rounded-btn border-2 border-border shadow-neo-sm">
              {error}
            </div>
          )}

          <Field label="QR Code Name" required>
            <Input
              type="text"
              placeholder="e.g. PayPal Checkout, Store Pass"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Category" required>
            <Select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as "payment" | "person" | "business"
                )
              }
              required
            >
              <option value="payment">Payment Code</option>
              <option value="person">Personal / Identity</option>
              <option value="business">Business / Merchant</option>
            </Select>
          </Field>

          <div>
            <span className="text-xs font-bold text-ink block mb-2">
              Select or Capture QR Image (Required)
            </span>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />

            <div className="flex gap-2.5 mb-3">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
              >
                Camera Capture
              </Button>
              <Button
                type="button"
                variant="cyan"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload File
              </Button>
            </div>

            {previewUrl && (
              <div className="rounded-btn border-2 border-border bg-surface p-3 flex items-center gap-3 shadow-neo-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-14 h-14 object-contain rounded-control border-2 border-border"
                />
                <div className="text-xs">
                  <p className="font-bold text-ink">Image Selected</p>
                  {isDecoding ? (
                    <p className="text-muted font-medium">
                      Decoding QR text...
                    </p>
                  ) : decodedData ? (
                    <p className="text-accent font-mono font-bold text-[11px]">
                      Decoded: {decodedData.substring(0, 30)}...
                    </p>
                  ) : (
                    <p className="text-muted text-[11px] font-medium">
                      (Image stored cleanly)
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Field label="Optional Note">
            <Input
              type="text"
              placeholder="e.g. Coffee shop loyalty, emergency payment"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <div className="pt-3 border-t-2 border-border flex justify-end gap-2.5">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={saving}
            >
              {saving ? "Storing..." : "Save to Vault"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* EDIT QR DIALOG */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit QR Code"
        description="Modify name, category, or notes."
        variant="sheet"
      >
        {editingItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <Field label="Name" required>
              <Input
                type="text"
                value={editingItem.name}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, name: e.target.value })
                }
                required
              />
            </Field>

            <Field label="Category" required>
              <Select
                value={editingItem.category}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    category: e.target.value as "payment" | "person" | "business",
                  })
                }
                required
              >
                <option value="payment">Payment Code</option>
                <option value="person">Personal / Identity</option>
                <option value="business">Business / Merchant</option>
              </Select>
            </Field>

            <Field label="Note">
              <Input
                type="text"
                value={editingItem.note || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, note: e.target.value })
                }
              />
            </Field>

            <Field label="Decoded Text">
              <Input
                type="text"
                value={editingItem.decodedText || ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    decodedText: e.target.value,
                  })
                }
              />
            </Field>

            <div className="pt-3 border-t-2 border-border flex justify-between gap-2.5">
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleDelete(editingItem)}
              >
                Delete
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}

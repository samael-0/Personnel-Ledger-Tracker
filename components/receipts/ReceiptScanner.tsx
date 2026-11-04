"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { compressImage } from "@/lib/client-image";
import { parseToMinorUnits, getCurrencyMeta } from "@/lib/money";
import { type Category, type Wallet } from "@/components/transactions/TransactionSheet";
import { getCategoryIconSymbol } from "@/lib/data/category-icons";

interface ReceiptScannerProps {
  categories: Category[];
  wallets: Wallet[];
  userCurrency: string;
}

interface ExtractedData {
  type: "expense" | "income";
  merchant: string;
  total: number;
  currency: string;
  date: string;
  category_suggestion: string;
  line_items: Array<{ name: string; qty: number; price: number }>;
  confidence: number;
  is_blurry: boolean;
  is_receipt: boolean;
  missing_date: boolean;
  multiple_currencies: boolean;
  notes?: string;
}

export function ReceiptScanner({
  categories: initialCategories,
  wallets,
  userCurrency,
}: ReceiptScannerProps) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const [localCategories, setLocalCategories] = React.useState<Category[]>(initialCategories);
  const [step, setStep] = React.useState<"idle" | "uploading" | "review">("idle");
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [currentFile, setCurrentFile] = React.useState<File | null>(null);
  const [receiptId, setReceiptId] = React.useState<string | null>(null);
  const [extracted, setExtracted] = React.useState<ExtractedData | null>(null);
  const [statusNotice, setStatusNotice] = React.useState<string | null>(null);
  const [allModelsFailed, setAllModelsFailed] = React.useState(false);
  const [retrying, setRetrying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Form editable state for review screen
  const [type, setType] = React.useState<"expense" | "income">("expense");
  const [merchant, setMerchant] = React.useState("");
  const [amountStr, setAmountStr] = React.useState("0");
  const [currency, setCurrency] = React.useState(userCurrency);
  const [dateStr, setDateStr] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [walletId, setWalletId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Inline category suggestion & creation
  const [suggestedNewCategory, setSuggestedNewCategory] = React.useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = React.useState(false);

  const defaultWallet = React.useMemo(() => {
    return (
      wallets.find((w) => w.isDefault && !w.isArchived) ||
      wallets.find((w) => !w.isArchived) ||
      wallets[0]
    );
  }, [wallets]);

  function initializeDefaults() {
    setType("expense");
    setAmountStr("0");
    setCurrency(userCurrency);
    setDateStr(new Date().toISOString().split("T")[0]);
    const defaultCat = localCategories.find((c) => c.kind === "expense" && !c.isArchived);
    if (defaultCat) setCategoryId(defaultCat.id);
    if (defaultWallet) setWalletId(defaultWallet.id);
    setSuggestedNewCategory(null);
  }

  function resolveCategoryMatch(rawSuggestion?: string) {
    const raw = rawSuggestion?.trim();
    if (!raw) {
      const defaultCat = localCategories.find((c) => c.kind === "expense" && !c.isArchived);
      if (defaultCat) setCategoryId(defaultCat.id);
      setSuggestedNewCategory(null);
      return;
    }

    const lowerRaw = raw.toLowerCase();
    // 1. Exact match
    const exactMatch = localCategories.find(
      (c) => c.name.toLowerCase() === lowerRaw && !c.isArchived
    );
    if (exactMatch) {
      setCategoryId(exactMatch.id);
      setSuggestedNewCategory(null);
      return;
    }

    // 2. Substring match
    const subMatch = localCategories.find(
      (c) =>
        !c.isArchived &&
        (c.name.toLowerCase().includes(lowerRaw) || lowerRaw.includes(c.name.toLowerCase()))
    );
    if (subMatch) {
      setCategoryId(subMatch.id);
      setSuggestedNewCategory(null);
      return;
    }

    // 3. Fallback to "Uncategorized" if available, else first expense category
    const uncategorized = localCategories.find(
      (c) => c.name.toLowerCase() === "uncategorized" && !c.isArchived
    );
    if (uncategorized) {
      setCategoryId(uncategorized.id);
    } else {
      const defaultCat = localCategories.find((c) => c.kind === "expense" && !c.isArchived);
      if (defaultCat) setCategoryId(defaultCat.id);
    }

    // Prompt user to create the suggested category
    setSuggestedNewCategory(raw);
  }

  async function handleQuickCreateSuggestedCategory(catName: string) {
    if (!catName.trim() || creatingCategory) return;
    setCreatingCategory(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          kind: type,
          icon: "receipt",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      const created: Category = data.category;
      setLocalCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setSuggestedNewCategory(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating category");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleFileSelect(file: File) {
    setError(null);
    setStatusNotice(null);
    setAllModelsFailed(false);
    setCurrentFile(file);
    setStep("uploading");

    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    try {
      const compressedFile = await compressImage(file, 1600, 0.85);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/receipts/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // If client is unauthorized (401) or bad request (400)
      if (res.status === 401 || res.status === 400) {
        setError(data.error || "Request failed");
        setStep("idle");
        return;
      }

      if (data.receiptId) {
        setReceiptId(data.receiptId);
      }

      if (data.allModelsFailed || !data.success) {
        // Requirement 4: Show "Scanning is busy right now. Enter it manually or try again" and open manual form with photo attached
        setAllModelsFailed(true);
        setStatusNotice("Scanning is busy right now. Enter it manually or try again");
        initializeDefaults();
        setStep("review");
        return;
      }

      const ext: ExtractedData = data.extracted;
      setExtracted(ext);

      // Prepopulate editable form fields
      setType(ext.type || "expense");
      setMerchant(ext.merchant || "Store Purchase");
      setAmountStr(ext.total ? ext.total.toString() : "0");
      setCurrency(ext.currency || userCurrency);
      setDateStr(ext.date || new Date().toISOString().split("T")[0]);

      // Resolve category match against user custom and shared categories
      resolveCategoryMatch(ext.category_suggestion);

      if (defaultWallet) {
        setWalletId(defaultWallet.id);
      }

      if (data.fallbackUsed && data.message) {
        setStatusNotice(data.message);
      }

      setStep("review");
    } catch (err: unknown) {
      // Network or unexpected failure: open manual review with photo still attached
      console.error("Extraction error:", err);
      setAllModelsFailed(true);
      setStatusNotice("Scanning is busy right now. Enter it manually or try again");
      initializeDefaults();
      setStep("review");
    }
  }

  async function handleRetry() {
    if (!currentFile) return;
    setRetrying(true);
    setError(null);

    try {
      const compressedFile = await compressImage(currentFile, 1600, 0.85);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/receipts/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.receiptId) {
        setReceiptId(data.receiptId);
      }

      if (data.allModelsFailed || !data.success) {
        setAllModelsFailed(true);
        setStatusNotice("Scanning is busy right now. Enter it manually or try again");
        return;
      }

      const ext: ExtractedData = data.extracted;
      setExtracted(ext);

      setType(ext.type || "expense");
      setMerchant(ext.merchant || "Store Purchase");
      setAmountStr(ext.total ? ext.total.toString() : "0");
      setCurrency(ext.currency || userCurrency);
      setDateStr(ext.date || new Date().toISOString().split("T")[0]);

      resolveCategoryMatch(ext.category_suggestion);

      setAllModelsFailed(false);
      setStatusNotice(null);
    } catch (err: unknown) {
      console.error("Retry error:", err);
      setAllModelsFailed(true);
      setStatusNotice("Scanning is busy right now. Enter it manually or try again");
    } finally {
      setRetrying(false);
    }
  }

  async function handleConfirmSave(e: React.FormEvent) {
    e.preventDefault();
    if (!merchant.trim()) {
      setError("Please specify a merchant name.");
      return;
    }
    const amountMinor = parseToMinorUnits(amountStr, currency);
    if (amountMinor <= 0) {
      setError("Please specify an amount greater than zero.");
      return;
    }
    if (!categoryId) {
      setError("Please select a valid category.");
      return;
    }
    if (!walletId) {
      setError("Please select a wallet.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        type,
        amountMinor,
        currency,
        categoryId,
        walletId,
        merchant: merchant.trim(),
        note: notes.trim() || (extracted?.notes ? extracted.notes : null),
        occurredAt: new Date(dateStr).toISOString(),
        source: "receipt",
        receiptId: receiptId || undefined,
      };

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save verified transaction");
      }

      router.push("/transactions");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (confirm("Discard this receipt scan and return to camera view?")) {
      setStep("idle");
      setImagePreviewUrl(null);
      setCurrentFile(null);
      setExtracted(null);
      setReceiptId(null);
      setError(null);
      setStatusNotice(null);
      setAllModelsFailed(false);
    }
  }

  const currencyMeta = getCurrencyMeta(currency);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
          Vision Receipt Scanner
        </h1>
        <p className="text-xs font-medium text-muted mt-0.5">
          Scan receipts directly with camera or upload. AI extracts fields for review before saving.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-btn bg-neo-coral/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
          {error}
        </div>
      )}

      {/* STEP 1: CAPTURE / UPLOAD PROMPT */}
      {step === "idle" && (
        <div className="bg-surface rounded-card border-2 border-border p-8 sm:p-12 text-center shadow-neo-sm flex flex-col items-center justify-center">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-neo-yellow border-2 border-border flex items-center justify-center text-ink shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer"
              title="Open camera"
            >
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          <h2 className="text-lg font-extrabold tracking-tight text-ink mt-2">
            Capture or Upload Receipt
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-md mt-1.5 mb-8 leading-relaxed font-medium">
            Take a clear photo with your phone camera or select an existing image file
            (JPEG, PNG, WebP) or PDF.
          </p>

          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />

          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => cameraInputRef.current?.click()}
            >
              Open Camera
            </Button>
            <Button
              variant="cyan"
              size="md"
              onClick={() => fileInputRef.current?.click()}
            >
              Select Image File
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === "uploading" && (
        <div className="bg-surface rounded-card border-2 border-border p-12 text-center shadow-neo-sm space-y-4">
          <div className="w-14 h-14 rounded-btn bg-neo-yellow border-2 border-border text-ink mx-auto flex items-center justify-center font-extrabold text-xl animate-pulse shadow-neo-sm">
            AI
          </div>
          <h2 className="text-base font-extrabold text-ink">
            Extracting Receipt Details
          </h2>
          <p className="text-xs font-medium text-muted max-w-sm mx-auto leading-relaxed">
            Compressing image and parsing merchant, total amount, line items, and date...
          </p>
        </div>
      )}

      {/* STEP 3: REVIEW SCREEN */}
      {step === "review" && (
        <div className="space-y-6">
          {/* REQUIREMENT 4 & 5: ERROR STATE WITH 'TRY AGAIN' BUTTON */}
          {allModelsFailed && (
            <div className="p-4 rounded-btn bg-neo-yellow/30 border-2 border-border text-ink font-bold text-xs shadow-neo-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>Scanning is busy right now. Enter it manually or try again</span>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? "Retrying..." : "Try again"}
              </Button>
            </div>
          )}

          {!allModelsFailed && statusNotice && (
            <div className="p-3.5 rounded-btn bg-neo-yellow/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
              Notice: {statusNotice}
            </div>
          )}

          {/* WARNING NOTICES WITH TEXT LABELS */}
          {extracted?.is_blurry && (
            <div className="p-3.5 rounded-btn bg-neo-coral/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
              [WARNING: IMAGE MAY BE BLURRY - PLEASE DOUBLE CHECK TOTAL]
            </div>
          )}

          {extracted?.is_receipt === false && (
            <div className="p-3.5 rounded-btn bg-neo-coral/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
              [WARNING: NON-RECEIPT DETECTED - PLEASE VERIFY RECORD DETAILS]
            </div>
          )}

          {extracted?.multiple_currencies && (
            <div className="p-3.5 rounded-btn bg-neo-yellow/20 border-2 border-border text-ink font-bold text-xs shadow-neo-sm">
              [WARNING: MULTIPLE CURRENCIES DETECTED - VERIFY BASE CURRENCY]
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: RECEIPT IMAGE PREVIEW (col-span-5) */}
            <div className="lg:col-span-5 bg-surface rounded-card border-2 border-border p-4 shadow-neo-sm flex flex-col justify-between">
              <div className="relative max-h-[500px] overflow-auto flex items-center justify-center rounded-btn bg-slate-950 p-2 border-2 border-border">
                {imagePreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreviewUrl}
                    alt="Scanned Receipt Preview"
                    className="max-h-[480px] w-auto object-contain rounded-control"
                  />
                ) : (
                  <div className="text-white text-xs p-12">
                    No image available
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t-2 border-border flex justify-between items-center text-xs font-bold text-muted">
                <span>Stored Privately</span>
                <span className="font-mono">Postgres Bytea</span>
              </div>
            </div>

            {/* RIGHT: EDITABLE FORM FIELDS (col-span-7) */}
            <div className="lg:col-span-7 bg-surface rounded-card border-2 border-border p-5 sm:p-6 shadow-neo-sm">
              <div className="border-b-2 border-border pb-3 mb-5 flex items-center justify-between">
                <h2 className="text-base font-extrabold text-ink">
                  Verify Transaction Details
                </h2>
                {!allModelsFailed && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-muted">Confidence:</span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-mono font-extrabold rounded-pill border border-border shadow-neo-sm ${
                        (extracted?.confidence || 0) < 0.6
                          ? "bg-neo-coral text-ink"
                          : "bg-neo-green text-ink"
                      }`}
                    >
                      {Math.round((extracted?.confidence || 0) * 100)}%
                    </span>
                  </div>
                )}
              </div>

              <form onSubmit={handleConfirmSave} className="space-y-4">
                <Field
                  label="Merchant Name"
                  description={
                    (extracted?.confidence || 0) < 0.6 && !allModelsFailed
                      ? "[LOW CONFIDENCE: PLEASE VERIFY MERCHANT]"
                      : undefined
                  }
                  required
                >
                  <Input
                    type="text"
                    value={merchant}
                    placeholder="e.g. Grocery Store"
                    onChange={(e) => setMerchant(e.target.value)}
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label={`Amount (${currencyMeta.symbol})`}
                    description={
                      (extracted?.confidence || 0) < 0.6 && !allModelsFailed
                        ? "[LOW CONFIDENCE: PLEASE VERIFY TOTAL AMOUNT]"
                        : undefined
                    }
                    required
                  >
                    <Input
                      type="text"
                      value={amountStr}
                      placeholder="0.00"
                      onChange={(e) => setAmountStr(e.target.value)}
                      required
                    />
                  </Field>

                  <Field
                    label="Transaction Date"
                    description={
                      extracted?.missing_date && !allModelsFailed
                        ? "[DATE AUTO-FILLED: DEFAULTED TO TODAY]"
                        : undefined
                    }
                    required
                  >
                    <Input
                      type="date"
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      required
                    />
                  </Field>
                </div>

                {suggestedNewCategory && (
                  <div className="p-3 rounded-btn bg-neo-yellow/20 border-2 border-border flex items-center justify-between gap-2 shadow-neo-sm">
                    <div className="text-xs font-bold text-ink truncate">
                      AI suggested category: <span className="underline">&quot;{suggestedNewCategory}&quot;</span>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleQuickCreateSuggestedCategory(suggestedNewCategory)}
                      disabled={creatingCategory}
                    >
                      {creatingCategory ? "Creating..." : "+ Create Category"}
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Category" required>
                    <Select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      required
                    >
                      {localCategories
                        .filter((c) => !c.isArchived || c.id === categoryId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryIconSymbol(c.icon)} {c.name} ({c.kind})
                          </option>
                        ))}
                    </Select>
                  </Field>

                  <Field label="Account" required>
                    <Select
                      value={walletId}
                      onChange={(e) => setWalletId(e.target.value)}
                      required
                    >
                      {wallets
                        .filter((w) => !w.isArchived || w.id === walletId)
                        .map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.currency || userCurrency} - {w.type}){w.isDefault ? " [Default]" : ""}
                          </option>
                        ))}
                    </Select>
                  </Field>
                </div>

                {extracted?.line_items && extracted.line_items.length > 0 && (
                  <div className="rounded-card border-2 border-border bg-surface-subtle/50 p-3 space-y-1.5">
                    <span className="text-[11px] font-bold text-muted block mb-1">
                      Detected Line Items:
                    </span>
                    {extracted.line_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-xs font-bold text-ink"
                      >
                        <span>
                          {item.qty}x {item.name}
                        </span>
                        <span className="font-mono font-extrabold">
                          {currencyMeta.symbol}
                          {item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <Field label="Notes & Context">
                  <Input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Business dinner, office supplies"
                  />
                </Field>

                <div className="pt-4 border-t-2 border-border flex flex-wrap gap-2.5">
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={handleDiscard}
                    disabled={saving}
                  >
                    Discard Scan
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Confirm & Save Entry"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

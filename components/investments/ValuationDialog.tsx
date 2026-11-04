"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { parseToMinorUnits, formatMoney } from "@/lib/money";
import { type InvestmentRecord } from "./InvestmentDialog";

interface ValuationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  investment: InvestmentRecord | null;
  userCurrency: string;
}

export function ValuationDialog({
  isOpen,
  onClose,
  onSaved,
  investment,
  userCurrency,
}: ValuationDialogProps) {
  const [newValuationStr, setNewValuationStr] = React.useState("");
  const [note, setNote] = React.useState("");
  const [dateStr, setDateStr] = React.useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (investment) {
      setNewValuationStr((investment.currentValueMinor / 100).toString());
      setNote("");
      setDateStr(new Date().toISOString().split("T")[0]);
      setError(null);
    }
  }, [investment, isOpen]);

  if (!investment) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const newMinor = parseToMinorUnits(newValuationStr, userCurrency);
    if (newMinor < 0) {
      setError("Valuation cannot be negative.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/investments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_valuation",
          investmentId: investment?.id,
          newCurrentValueMinor: newMinor,
          note: note.trim() || "Manual benchmark valuation",
          occurredAt: new Date(dateStr).toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to record valuation");

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating valuation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Update Asset Valuation"
      description={`Record manual benchmark for ${investment.name}`}
      variant="modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-neo-coral/20 text-ink font-bold text-xs rounded-btn border-2 border-border shadow-neo-sm">
            {error}
          </div>
        )}

        <div className="rounded-btn border-2 border-border bg-surface-subtle p-3.5 flex justify-between text-xs font-bold shadow-neo-sm">
          <span className="text-muted">Current Book Value:</span>
          <span className="font-mono font-extrabold text-ink">
            {formatMoney(investment.currentValueMinor, userCurrency)}
          </span>
        </div>

        <Field label="New Valuation Amount" required>
          <Input
            type="text"
            value={newValuationStr}
            onChange={(e) => setNewValuationStr(e.target.value)}
            required
          />
        </Field>

        <Field label="Valuation Date" required>
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            required
          />
        </Field>

        <Field label="Audit Reason or Benchmark Source">
          <Input
            type="text"
            placeholder="e.g. Q3 Tax appraisal, Quarterly statement, Spot gold check"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        <div className="pt-3 border-t-2 border-border flex justify-end gap-2.5">
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Recording..." : "Save Valuation"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

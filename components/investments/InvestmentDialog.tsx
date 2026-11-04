"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Field } from "@/components/ui/Field";
import { parseToMinorUnits } from "@/lib/money";

export interface InvestmentRecord {
  id?: string;
  type: "stock" | "gold" | "property" | "business" | "other";
  name: string;
  quantity: string;
  unit?: string | null;
  purchasePriceMinor: number;
  purchaseDate: string | Date;
  currentValueMinor: number;
  currency: string;
  notes?: string | null;
  extraFields?: Record<string, any> | null;
  events?: Array<{
    id: string;
    eventType: string;
    amountMinor?: number | null;
    quantity?: string | null;
    note?: string | null;
    occurredAt: string | Date;
  }>;
}

interface InvestmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  userCurrency: string;
  initialInvestment?: InvestmentRecord | null;
}

export function InvestmentDialog({
  isOpen,
  onClose,
  onSaved,
  userCurrency,
  initialInvestment,
}: InvestmentDialogProps) {
  const [type, setType] = React.useState<
    "stock" | "gold" | "property" | "business" | "other"
  >("stock");
  const [name, setName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unit, setUnit] = React.useState("");
  const [purchasePriceStr, setPurchasePriceStr] = React.useState("0");
  const [currentValueStr, setCurrentValueStr] = React.useState("0");
  const [purchaseDate, setPurchaseDate] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = React.useState("");

  // Adaptive type-specific fields
  const [ticker, setTicker] = React.useState("");
  const [shares, setShares] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [area, setArea] = React.useState("");
  const [ownershipPercentage, setOwnershipPercentage] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialInvestment) {
      setType(initialInvestment.type);
      setName(initialInvestment.name);
      setQuantity(initialInvestment.quantity);
      setUnit(initialInvestment.unit || "");
      setPurchasePriceStr((initialInvestment.purchasePriceMinor / 100).toString());
      setCurrentValueStr((initialInvestment.currentValueMinor / 100).toString());
      const d = new Date(initialInvestment.purchaseDate);
      setPurchaseDate(d.toISOString().split("T")[0]);
      setNotes(initialInvestment.notes || "");

      const extra = initialInvestment.extraFields || {};
      setTicker(extra.ticker || "");
      setShares(extra.shares || "");
      setWeight(extra.weight || "");
      setLocation(extra.location || "");
      setArea(extra.area || "");
      setOwnershipPercentage(extra.ownershipPercentage || "");
    } else {
      setType("stock");
      setName("");
      setQuantity("1");
      setUnit("");
      setPurchasePriceStr("0");
      setCurrentValueStr("0");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setTicker("");
      setShares("");
      setWeight("");
      setLocation("");
      setArea("");
      setOwnershipPercentage("");
    }
  }, [initialInvestment, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Asset name is required.");
      return;
    }

    const purchasePriceMinor = parseToMinorUnits(purchasePriceStr, userCurrency);
    const currentValueMinor = parseToMinorUnits(
      currentValueStr || purchasePriceStr,
      userCurrency
    );

    if (purchasePriceMinor < 0 || currentValueMinor < 0) {
      setError("Price and valuation values cannot be negative.");
      return;
    }

    setSaving(true);

    try {
      // Build type-specific metadata object
      const extraFields: Record<string, string> = {};
      if (type === "stock") {
        if (ticker) extraFields.ticker = ticker.trim();
        if (shares) extraFields.shares = shares.trim();
      } else if (type === "gold") {
        if (weight) extraFields.weight = weight.trim();
      } else if (type === "property") {
        if (location) extraFields.location = location.trim();
        if (area) extraFields.area = area.trim();
      } else if (type === "business") {
        if (ownershipPercentage)
          extraFields.ownershipPercentage = ownershipPercentage.trim();
      }

      const payload = {
        id: initialInvestment?.id,
        type,
        name: name.trim(),
        quantity: quantity.trim() || "1",
        unit: unit.trim() || null,
        purchasePriceMinor,
        purchaseDate: new Date(purchaseDate).toISOString(),
        currentValueMinor,
        currency: userCurrency,
        notes: notes.trim() || null,
        extraFields: Object.keys(extraFields).length > 0 ? extraFields : null,
      };

      const method = initialInvestment?.id ? "PUT" : "POST";
      const res = await fetch("/api/investments", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save investment");
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error saving asset";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialInvestment?.id ? "Edit Capital Asset" : "Record New Capital Asset"}
      description="Track physical, equity, and business assets."
      variant="sheet"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 bg-neo-coral/20 text-ink rounded-btn border-2 border-border font-bold text-xs shadow-neo-sm">
            {error}
          </div>
        )}

        <Field label="Asset Category" required>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            required
          >
            <option value="stock">Equity / Stock</option>
            <option value="gold">Physical Gold / Bullion</option>
            <option value="property">Real Estate / Property</option>
            <option value="business">Private Business Equity</option>
            <option value="other">Other Capital Asset</option>
          </Select>
        </Field>

        <Field label="Asset Name" required>
          <Input
            type="text"
            placeholder={
              type === "stock"
                ? "e.g. Apple Inc, Vanguard Total Market"
                : type === "gold"
                ? "e.g. 24K Gold Bar, Sovereign Coins"
                : type === "property"
                ? "e.g. Downtown Rental Apartment"
                : type === "business"
                ? "e.g. Local Roastery LLC"
                : "e.g. Vintage Watch, Collectible"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        {/* ADAPTIVE TYPE-SPECIFIC FIELDS */}
        {type === "stock" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-btn border-2 border-border bg-surface-subtle/50 p-3.5 shadow-neo-sm">
            <Field label="Ticker Symbol">
              <Input
                type="text"
                placeholder="e.g. AAPL, VOO"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              />
            </Field>
            <Field label="Number of Shares">
              <Input
                type="text"
                placeholder="e.g. 50"
                value={shares}
                onChange={(e) => {
                  setShares(e.target.value);
                  setQuantity(e.target.value);
                }}
              />
            </Field>
          </div>
        )}

        {type === "gold" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-btn border-2 border-border bg-surface-subtle/50 p-3.5 shadow-neo-sm">
            <Field label="Weight">
              <Input
                type="text"
                placeholder="e.g. 10, 100"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setQuantity(e.target.value);
                }}
              />
            </Field>
            <Field label="Unit">
              <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="grams">Grams</option>
                <option value="oz">Troy Ounces (oz)</option>
                <option value="tolas">Tolas</option>
                <option value="kg">Kilograms</option>
              </Select>
            </Field>
          </div>
        )}

        {type === "property" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-btn border-2 border-border bg-surface-subtle/50 p-3.5 shadow-neo-sm">
            <Field label="Property Location">
              <Input
                type="text"
                placeholder="e.g. 42 Wall St, Suite 10"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </Field>
            <Field label="Area Specification">
              <Input
                type="text"
                placeholder="e.g. 1,450 sq ft, 2.5 acres"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setUnit(e.target.value);
                }}
              />
            </Field>
          </div>
        )}

        {type === "business" && (
          <div className="rounded-btn border-2 border-border bg-surface-subtle/50 p-3.5 shadow-neo-sm">
            <Field label="Ownership Percentage (%)">
              <Input
                type="text"
                placeholder="e.g. 25%"
                value={ownershipPercentage}
                onChange={(e) => {
                  setOwnershipPercentage(e.target.value);
                  setQuantity(e.target.value);
                }}
              />
            </Field>
          </div>
        )}

        {/* VALUATION & FINANCIALS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Purchase Price (Total Minor Units)" required>
            <Input
              type="text"
              placeholder="e.g. 5000.00"
              value={purchasePriceStr}
              onChange={(e) => setPurchasePriceStr(e.target.value)}
              required
            />
          </Field>
          <Field label="Current Manual Valuation" required>
            <Input
              type="text"
              placeholder="e.g. 5500.00"
              value={currentValueStr}
              onChange={(e) => setCurrentValueStr(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Acquisition Date" required>
          <Input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Context / Ledger Notes">
          <Input
            type="text"
            placeholder="e.g. Custody at safe deposit box, certificate #104"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <div className="pt-3 border-t-2 border-border flex justify-end gap-2.5">
          <Button
            type="button"
            variant="quiet"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : initialInvestment?.id
              ? "Update Asset"
              : "Record Asset"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

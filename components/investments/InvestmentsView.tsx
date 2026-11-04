"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Disclosure } from "@/components/ui/Disclosure";
import {
  InvestmentDialog,
  type InvestmentRecord,
} from "./InvestmentDialog";
import { ValuationDialog } from "./ValuationDialog";
import { formatMoney } from "@/lib/money";

interface InvestmentsViewProps {
  initialInvestments: InvestmentRecord[];
  userCurrency: string;
}

export function InvestmentsView({
  initialInvestments,
  userCurrency,
}: InvestmentsViewProps) {
  const [items, setItems] = React.useState<InvestmentRecord[]>(initialInvestments);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InvestmentRecord | null>(null);
  const [valuingItem, setValuingItem] = React.useState<InvestmentRecord | null>(null);

  const refreshItems = React.useCallback(async () => {
    try {
      const res = await fetch("/api/investments");
      if (res.ok) {
        const data = await res.json();
        setItems(data.investments || []);
      }
    } catch (e) {
      console.error("Failed to load investments", e);
    }
  }, []);

  // Compute portfolio totals
  const totalInvestedMinor = items.reduce(
    (sum, inv) => sum + inv.purchasePriceMinor,
    0
  );
  const totalCurrentValueMinor = items.reduce(
    (sum, inv) => sum + inv.currentValueMinor,
    0
  );
  const netGainLossMinor = totalCurrentValueMinor - totalInvestedMinor;
  const netPercentage =
    totalInvestedMinor > 0
      ? (netGainLossMinor / totalInvestedMinor) * 100
      : 0;

  // Asset allocation by class
  const allocationByType: { [type: string]: number } = {};
  for (const inv of items) {
    allocationByType[inv.type] =
      (allocationByType[inv.type] || 0) + inv.currentValueMinor;
  }

  const allocationList = Object.entries(allocationByType).map(
    ([type, valMinor]) => ({
      type,
      valMinor,
      percentage:
        totalCurrentValueMinor > 0
          ? Math.round((valMinor / totalCurrentValueMinor) * 100)
          : 0,
    })
  );

  async function handleDelete(id: string) {
    if (!confirm("Delete this investment and all its valuation records?")) return;
    try {
      await fetch(`/api/investments?id=${id}`, { method: "DELETE" });
      refreshItems();
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  return (
    <div className="space-y-6">
      {/* CAPITAL OVERVIEW HERO */}
      <div className="bg-surface rounded-card border-2 border-border p-6 shadow-neo space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-2 border-border pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-neo-yellow border border-border text-[11px] font-extrabold text-ink mb-1.5 shadow-neo-sm">
              <span>Capital Ledger</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
              Physical & Equity Assets
            </h1>
            <p className="text-xs font-medium text-muted mt-0.5">
              Disciplined valuation tracking without broker noise or live price volatility
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingItem(null);
              setIsAddOpen(true);
            }}
          >
            + Record Asset
          </Button>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-btn bg-surface-subtle/50 border-2 border-border shadow-neo-sm">
            <span className="text-xs font-extrabold text-muted uppercase tracking-wider block">
              Total Book Cost
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-extrabold font-mono font-tabular text-ink">
                {formatMoney(totalInvestedMinor, userCurrency)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-muted">
              Initial Principal Basis
            </span>
          </div>

          <div className="p-4 rounded-btn bg-surface-subtle/50 border-2 border-border shadow-neo-sm">
            <span className="text-xs font-extrabold text-muted uppercase tracking-wider block">
              Current Benchmark Valuation
            </span>
            <div className="my-2">
              <span className="text-xl sm:text-2xl font-extrabold font-mono font-tabular text-ink">
                {formatMoney(totalCurrentValueMinor, userCurrency)}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-muted">
              Audit Benchmark
            </span>
          </div>

          <div className="p-4 rounded-btn bg-surface-subtle/50 border-2 border-border shadow-neo-sm">
            <span className="text-xs font-extrabold text-muted uppercase tracking-wider block">
              Total Unrealized Return
            </span>
            <div className="my-2">
              <span
                className={`text-xl sm:text-2xl font-extrabold font-mono font-tabular ${
                  netGainLossMinor >= 0 ? "text-accent" : "text-danger"
                }`}
              >
                {netGainLossMinor >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(netGainLossMinor), userCurrency)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-pill border border-border shadow-neo-sm ${
                  netGainLossMinor >= 0
                    ? "bg-neo-green text-ink"
                    : "bg-neo-coral text-ink"
                }`}
              >
                {netPercentage >= 0 ? "+" : ""}
                {netPercentage.toFixed(1)}%
              </span>
              <span className="text-[11px] font-bold text-muted">
                {netGainLossMinor >= 0 ? "Net Gain (+)" : "Net Loss (-)"}
              </span>
            </div>
          </div>
        </div>

        {/* PROPORTIONAL ALLOCATION STRIP */}
        {allocationList.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-extrabold text-ink">Asset Allocation</span>
              <span className="font-mono font-bold text-muted text-[11px]">By Class</span>
            </div>
            <div className="h-4 w-full rounded-pill bg-surface-subtle overflow-hidden flex border-2 border-border shadow-neo-sm">
              {allocationList.map((alloc, idx) => {
                const colors = [
                  "bg-neo-yellow",
                  "bg-neo-cyan",
                  "bg-neo-purple",
                  "bg-neo-coral",
                  "bg-neo-green",
                ];
                const c = colors[idx % colors.length];
                return (
                  <div
                    key={alloc.type}
                    style={{ width: `${Math.max(alloc.percentage, 4)}%` }}
                    className={`h-full ${c} border-r-2 border-border last:border-r-0`}
                    title={`${alloc.type}: ${alloc.percentage}%`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              {allocationList.map((alloc, idx) => {
                const colors = [
                  "bg-neo-yellow",
                  "bg-neo-cyan",
                  "bg-neo-purple",
                  "bg-neo-coral",
                  "bg-neo-green",
                ];
                const c = colors[idx % colors.length];
                return (
                  <div
                    key={alloc.type}
                    className="flex items-center gap-1.5 text-xs text-muted"
                  >
                    <span className={`w-3 h-3 rounded-control border border-border ${c} shadow-neo-sm`} />
                    <span className="capitalize text-ink font-bold">{alloc.type}:</span>
                    <span className="font-mono font-semibold">
                      {formatMoney(alloc.valMinor, userCurrency)} ({alloc.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ASSETS LIST */}
      {items.length === 0 ? (
        <EmptyState
          title="No Capital Assets Stored"
          description="Record gold, real estate property, private business equity, or stocks to track your total net worth."
          actionLabel="+ Record First Asset"
          onAction={() => {
            setEditingItem(null);
            setIsAddOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-ink">
            Individual Asset Ledgers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const gainMinor = item.currentValueMinor - item.purchasePriceMinor;
              const gainPercent =
                item.purchasePriceMinor > 0
                  ? (gainMinor / item.purchasePriceMinor) * 100
                  : 0;
              const isGain = gainMinor >= 0;

              return (
                <div
                  key={item.id}
                  className="bg-surface rounded-card border-2 border-border shadow-neo-sm flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* ASSET HEADER */}
                    <div className="border-b-2 border-border bg-surface-subtle/50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold bg-neo-yellow/30 border border-border text-ink px-2.5 py-0.5 rounded-pill capitalize shadow-neo-sm">
                          {item.type}
                        </span>
                        <span className="text-xs text-muted font-bold">
                          Qty: {item.quantity} {item.unit || ""}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="cyan"
                          size="sm"
                          onClick={() => setValuingItem(item)}
                        >
                          Benchmark
                        </Button>
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsAddOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>

                    {/* ASSET MAIN INFO */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-base font-extrabold text-ink">
                          {item.name}
                        </h3>
                        {item.notes && (
                          <p className="text-xs text-muted mt-0.5 font-medium">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Type-specific details */}
                      {item.extraFields && (
                        <div className="text-xs border-2 border-border rounded-btn bg-surface-subtle/50 p-3 space-y-1 shadow-neo-sm">
                          {item.extraFields.ticker && (
                            <p className="text-muted font-medium">Ticker: <strong className="text-ink font-bold">{item.extraFields.ticker}</strong></p>
                          )}
                          {item.extraFields.shares && (
                            <p className="text-muted font-medium">Shares: <strong className="text-ink font-bold">{item.extraFields.shares}</strong></p>
                          )}
                          {item.extraFields.location && (
                            <p className="text-muted font-medium">Location: <strong className="text-ink font-bold">{item.extraFields.location}</strong></p>
                          )}
                          {item.extraFields.area && (
                            <p className="text-muted font-medium">Area: <strong className="text-ink font-bold">{item.extraFields.area}</strong></p>
                          )}
                          {item.extraFields.ownershipPercentage && (
                            <p className="text-muted font-medium">Ownership: <strong className="text-ink font-bold">{item.extraFields.ownershipPercentage}%</strong></p>
                          )}
                          {item.extraFields.weight && (
                            <p className="text-muted font-medium">Weight: <strong className="text-ink font-bold">{item.extraFields.weight} {item.unit || "grams"}</strong></p>
                          )}
                        </div>
                      )}

                      {/* METRICS */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-border">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted block">
                            Cost Basis
                          </span>
                          <span className="text-sm font-extrabold font-mono font-tabular text-ink">
                            {formatMoney(item.purchasePriceMinor, item.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted block">
                            Current Valuation
                          </span>
                          <span className="text-sm font-extrabold font-mono font-tabular text-ink">
                            {formatMoney(item.currentValueMinor, item.currency)}
                          </span>
                        </div>
                      </div>

                      {/* GAIN / LOSS LABEL */}
                      <div className="pt-1">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-mono font-extrabold rounded-pill border border-border shadow-neo-sm ${
                            isGain
                              ? "bg-neo-green text-ink"
                              : "bg-neo-coral text-ink"
                          }`}
                        >
                          {isGain ? "+" : "-"}
                          {formatMoney(Math.abs(gainMinor), item.currency)} (
                          {gainPercent >= 0 ? "+" : ""}
                          {gainPercent.toFixed(1)}%) {isGain ? "Net Gain (+)" : "Net Loss (-)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AUDIT HISTORY */}
                  <div className="p-3.5 border-t-2 border-border bg-surface-subtle/30 space-y-2">
                    <Disclosure
                      title="Valuation Audit History"
                      subtitle={`${item.events?.length || 0} recorded benchmark events`}
                    >
                      {item.events && item.events.length > 0 ? (
                        <div className="divide-y-2 divide-border text-xs">
                          {item.events.map((ev) => (
                            <div key={ev.id} className="py-2 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-ink block capitalize">
                                  {ev.eventType.replace("_", " ")}
                                </span>
                                <span className="text-muted text-[11px] font-medium">
                                  {new Date(ev.occurredAt).toLocaleDateString()}
                                  {ev.note ? ` - ${ev.note}` : ""}
                                </span>
                              </div>
                              <span className="font-mono font-extrabold text-ink">
                                {ev.amountMinor
                                  ? formatMoney(ev.amountMinor, item.currency)
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic font-medium">
                          No valuation events recorded yet.
                        </p>
                      )}
                    </Disclosure>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => item.id && handleDelete(item.id)}
                        className="text-[11px] font-bold text-danger hover:underline"
                      >
                        Delete Asset Record
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <InvestmentDialog
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        onSaved={refreshItems}
        userCurrency={userCurrency}
        initialInvestment={editingItem}
      />

      {/* VALUATION UPDATE DIALOG */}
      <ValuationDialog
        isOpen={!!valuingItem}
        onClose={() => setValuingItem(null)}
        onSaved={refreshItems}
        investment={valuingItem}
        userCurrency={userCurrency}
      />
    </div>
  );
}

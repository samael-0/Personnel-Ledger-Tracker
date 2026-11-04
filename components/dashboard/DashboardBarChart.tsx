"use client";

import * as React from "react";
import { formatMoney } from "@/lib/money";
import type { ChartPeriodBucket, ChartWindow } from "@/lib/data/chart-data";

interface DashboardBarChartProps {
  initialData: ChartPeriodBucket[];
  userCurrency: string;
  selectedAccountFilter: string;
}

export function DashboardBarChart({
  initialData,
  userCurrency,
  selectedAccountFilter,
}: DashboardBarChartProps) {
  const [window, setWindow] = React.useState<ChartWindow>("6m");
  const [data, setData] = React.useState<ChartPeriodBucket[]>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [activeBucket, setActiveBucket] = React.useState<ChartPeriodBucket | null>(null);

  // Fetch updated data when window or account filter changes
  React.useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/transactions/chart?window=${window}&walletId=${encodeURIComponent(
            selectedAccountFilter
          )}`
        );
        if (res.ok && active) {
          const json = await res.json();
          setData(json.chartData || []);
        }
      } catch (err) {
        console.warn("Failed to load chart data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [window, selectedAccountFilter]);

  // Compute maximum for bar scaling
  const maxMinor = React.useMemo(() => {
    let max = 0;
    for (const b of data) {
      if (b.incomeMinor > max) max = b.incomeMinor;
      if (b.expenseMinor > max) max = b.expenseMinor;
    }
    return max > 0 ? max : 1; // avoid division by 0
  }, [data]);

  const isEmpty = data.every((b) => b.incomeMinor === 0 && b.expenseMinor === 0);

  // Chart dimensions
  const svgHeight = 220;
  const svgWidth = Math.max(360, data.length * 64);
  const chartBottom = 160;
  const chartTop = 30;
  const maxBarHeight = chartBottom - chartTop;

  return (
    <div className="bg-surface rounded-card border-2 border-border shadow-neo p-4 sm:p-5 space-y-4">
      {/* HEADER & TIME WINDOW TOGGLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-ink">
              Cash Flow: Inflow vs Expense
            </h2>
            {loading && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface-subtle border border-border text-muted animate-pulse">
                Updating...
              </span>
            )}
          </div>
          <p className="text-[11px] font-bold text-muted">
            Grouped comparison excluding transfers
          </p>
        </div>

        {/* WINDOW SWITCHER */}
        <div
          role="radiogroup"
          aria-label="Chart time window"
          className="inline-flex items-center bg-surface-subtle p-1 rounded-control border-2 border-border shadow-neo-sm self-start sm:self-auto"
        >
          {(
            [
              { id: "7d", label: "7 Days" },
              { id: "6m", label: "6 Months" },
              { id: "12m", label: "12 Months" },
            ] as const
          ).map((item) => {
            const isSelected = window === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setWindow(item.id)}
                className={`px-2.5 py-1 text-xs font-black rounded-btn transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                  isSelected
                    ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PATTERN LEGEND (Distinguishable without color alone) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-ink px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-3.5 h-3.5 rounded-sm bg-emerald-500 border border-border inline-block"
            />
            <span>Income (Solid Left)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-3.5 h-3.5 rounded-sm border border-border inline-block relative overflow-hidden bg-rose-500/20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #E11D48, #E11D48 2px, transparent 2px, transparent 6px)",
              }}
            />
            <span>Expense (Hatched Right)</span>
          </div>
        </div>

        {activeBucket && (
          <div className="text-[11px] font-mono font-bold bg-surface-subtle border border-border px-2 py-0.5 rounded-pill text-ink">
            {activeBucket.label}: Net{" "}
            {activeBucket.netMinor >= 0 ? "+" : "-"}
            {formatMoney(Math.abs(activeBucket.netMinor), userCurrency)}
          </div>
        )}
      </div>

      {/* SVG BAR CHART CONTAINER */}
      <div className="w-full overflow-x-auto overflow-y-hidden pt-2 pb-1 scrollbar-thin">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 min-w-[340px] overflow-visible select-none"
          role="img"
          aria-labelledby="chart-title chart-desc"
        >
          <title id="chart-title">Income and Expense Bar Chart</title>
          <desc id="chart-desc">
            Visual comparison of income and expenses across {data.length} periods.
          </desc>

          <defs>
            {/* Accessible high-contrast hatch pattern for Expense */}
            <pattern
              id="expenseHatchPattern"
              width="6"
              height="6"
              patternTransform="rotate(45 0 0)"
              patternUnits="userSpaceOnUse"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="#E11D48"
                strokeWidth="2.5"
              />
            </pattern>
          </defs>

          {/* Gridlines */}
          <line
            x1="10"
            y1={chartTop}
            x2={svgWidth - 10}
            y2={chartTop}
            stroke="currentColor"
            className="text-border/15"
            strokeDasharray="3 3"
          />
          <line
            x1="10"
            y1={(chartTop + chartBottom) / 2}
            x2={svgWidth - 10}
            y2={(chartTop + chartBottom) / 2}
            stroke="currentColor"
            className="text-border/15"
            strokeDasharray="3 3"
          />
          {/* Baseline */}
          <line
            x1="10"
            y1={chartBottom}
            x2={svgWidth - 10}
            y2={chartBottom}
            stroke="currentColor"
            className="text-border"
            strokeWidth="2"
          />

          {/* Period Columns & Bars */}
          {data.map((bucket, index) => {
            const colWidth = svgWidth / data.length;
            const groupCenterX = colWidth * index + colWidth / 2;
            const barWidth = Math.min(18, Math.max(12, colWidth * 0.28));
            const gap = 3;

            const incomeHeight =
              bucket.incomeMinor > 0
                ? Math.max(4, (bucket.incomeMinor / maxMinor) * maxBarHeight)
                : 0;
            const expenseHeight =
              bucket.expenseMinor > 0
                ? Math.max(4, (bucket.expenseMinor / maxMinor) * maxBarHeight)
                : 0;

            const incomeX = groupCenterX - barWidth - gap / 2;
            const incomeY = chartBottom - incomeHeight;

            const expenseX = groupCenterX + gap / 2;
            const expenseY = chartBottom - expenseHeight;

            const isHighlighted = activeBucket?.periodKey === bucket.periodKey;

            return (
              <g
                key={bucket.periodKey}
                tabIndex={0}
                role="group"
                aria-label={`${bucket.label}: Inflow ${formatMoney(
                  bucket.incomeMinor,
                  userCurrency
                )}, Expense ${formatMoney(
                  bucket.expenseMinor,
                  userCurrency
                )}, Net ${bucket.netMinor >= 0 ? "+" : "-"}${formatMoney(
                  Math.abs(bucket.netMinor),
                  userCurrency
                )}`}
                onFocus={() => setActiveBucket(bucket)}
                onBlur={() => setActiveBucket(null)}
                onMouseEnter={() => setActiveBucket(bucket)}
                onMouseLeave={() => setActiveBucket(null)}
                className="cursor-pointer focus:outline-none group transition-opacity"
              >
                {/* Column background hover highlight */}
                <rect
                  x={colWidth * index + 2}
                  y={chartTop - 12}
                  width={colWidth - 4}
                  height={svgHeight - chartTop}
                  rx="6"
                  className={`transition-colors ${
                    isHighlighted
                      ? "fill-neo-yellow/20 stroke-2 stroke-ink"
                      : "fill-transparent group-hover:fill-surface-subtle/50"
                  }`}
                />

                {/* Current period indicator pill */}
                {bucket.isCurrent && (
                  <g transform={`translate(${groupCenterX}, ${chartTop - 14})`}>
                    <rect
                      x="-18"
                      y="0"
                      width="36"
                      height="12"
                      rx="6"
                      className="fill-neo-yellow stroke stroke-border"
                    />
                    <text
                      x="0"
                      y="8"
                      textAnchor="middle"
                      className="text-[8px] font-black fill-ink uppercase"
                    >
                      Now
                    </text>
                  </g>
                )}

                {/* INCOME BAR (Left, Solid) */}
                {incomeHeight > 0 ? (
                  <rect
                    x={incomeX}
                    y={incomeY}
                    width={barWidth}
                    height={incomeHeight}
                    rx="3"
                    className="fill-emerald-500 stroke stroke-border motion-safe:transition-all"
                  />
                ) : (
                  <rect
                    x={incomeX}
                    y={chartBottom - 2}
                    width={barWidth}
                    height={2}
                    className="fill-border/30"
                  />
                )}

                {/* EXPENSE BAR (Right, Hatched Pattern) */}
                {expenseHeight > 0 ? (
                  <g>
                    {/* Background tint */}
                    <rect
                      x={expenseX}
                      y={expenseY}
                      width={barWidth}
                      height={expenseHeight}
                      rx="3"
                      className="fill-rose-500/20"
                    />
                    {/* Pattern fill overlay */}
                    <rect
                      x={expenseX}
                      y={expenseY}
                      width={barWidth}
                      height={expenseHeight}
                      rx="3"
                      fill="url(#expenseHatchPattern)"
                      className="stroke stroke-border motion-safe:transition-all"
                    />
                  </g>
                ) : (
                  <rect
                    x={expenseX}
                    y={chartBottom - 2}
                    width={barWidth}
                    height={2}
                    className="fill-border/30"
                  />
                )}

                {/* PERIOD LABEL BELOW BASELINE */}
                <text
                  x={groupCenterX}
                  y={chartBottom + 16}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${
                    bucket.isCurrent ? "font-black fill-ink" : "fill-muted"
                  }`}
                >
                  {bucket.label}
                </text>

                {/* NET FLOW ROW BELOW PERIOD */}
                <text
                  x={groupCenterX}
                  y={chartBottom + 30}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-black ${
                    bucket.netMinor >= 0
                      ? "fill-emerald-600 dark:fill-emerald-400"
                      : "fill-rose-600 dark:fill-rose-400"
                  }`}
                >
                  {bucket.netMinor === 0
                    ? "0"
                    : `${bucket.netMinor > 0 ? "+" : "-"}${formatMoney(
                        Math.abs(bucket.netMinor),
                        userCurrency
                      )}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* EMPTY DATA NOTICE */}
      {isEmpty && (
        <div className="py-2 px-3 rounded-btn bg-surface-subtle border border-border text-center">
          <p className="text-xs font-bold text-muted">
            No inflow or expenses recorded for this timeframe yet.
          </p>
        </div>
      )}

      {/* VISUALLY HIDDEN ACCESSIBLE DATA TABLE FOR SCREEN READERS */}
      <table className="sr-only">
        <caption>
          Cash Flow summary by period showing income, expenses and net totals in {userCurrency}.
        </caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Inflow</th>
            <th scope="col">Expense</th>
            <th scope="col">Net</th>
            <th scope="col">Current Period</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => (
            <tr key={b.periodKey}>
              <td>{b.label}</td>
              <td>{formatMoney(b.incomeMinor, userCurrency)}</td>
              <td>{formatMoney(b.expenseMinor, userCurrency)}</td>
              <td>
                {b.netMinor >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(b.netMinor), userCurrency)}
              </td>
              <td>{b.isCurrent ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


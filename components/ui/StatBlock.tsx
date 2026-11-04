import * as React from "react";

export interface StatBlockProps {
  label: string;
  value: string;
  subtext?: string;
  variant?: "yellow" | "red" | "blue" | "white" | "quiet";
  className?: string;
}

export function StatBlock({
  label,
  value,
  subtext,
  className = "",
}: StatBlockProps) {
  return (
    <div
      className={`border-2 border-border bg-surface rounded-card p-4 sm:p-5 shadow-neo-sm flex flex-col justify-between ${className}`}
    >
      <span className="text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="my-2.5">
        <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-ink font-tabular break-all">
          {value}
        </span>
      </div>
      {subtext && (
        <span className="text-xs font-semibold text-muted">
          {subtext}
        </span>
      )}
    </div>
  );
}

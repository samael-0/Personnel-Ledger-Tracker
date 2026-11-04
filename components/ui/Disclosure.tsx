"use client";

import * as React from "react";

export interface DisclosureProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Disclosure({
  title,
  subtitle,
  defaultOpen = false,
  children,
  className = "",
}: DisclosureProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div
      className={`border-2 border-border bg-surface rounded-card shadow-neo-sm overflow-hidden ${className}`}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left font-bold hover:bg-surface-subtle/50 transition-colors select-none"
      >
        <div>
          <span className="text-sm font-bold text-ink">
            {title}
          </span>
          {subtitle && (
            <p className="text-xs text-muted font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className={`w-7 h-7 rounded-control border-2 border-border bg-surface flex items-center justify-center text-ink shrink-0 ml-3 transition-transform duration-200 shadow-neo-sm ${
            isOpen ? "rotate-180 bg-neo-yellow" : ""
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      {isOpen && (
        <div className="border-t-2 border-border p-4 bg-surface-subtle/40 space-y-3 text-sm text-ink">
          {children}
        </div>
      )}
    </div>
  );
}

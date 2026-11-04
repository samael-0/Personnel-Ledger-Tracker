"use client";

import * as React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 p-1.5 bg-surface-subtle border-2 border-border rounded-btn overflow-x-auto shadow-neo-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex-1 min-w-[90px] py-2 px-3 text-xs font-bold rounded-control transition-all duration-150 select-none text-center flex items-center justify-center gap-1.5 ${
              isActive
                ? "bg-neo-yellow text-ink border-2 border-border shadow-neo-sm"
                : "text-muted hover:text-ink hover:bg-surface"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full border ${
                  isActive
                    ? "bg-white text-ink border-border font-bold"
                    : "bg-surface text-muted border-border/40"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

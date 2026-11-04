"use client";

import * as React from "react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "sheet" | "modal";
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = "sheet",
}: DialogProps) {
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-h-[92vh] overflow-y-auto bg-ground border-t-2 sm:border-2 border-border shadow-neo-lg flex flex-col ${
          variant === "sheet"
            ? "rounded-t-[28px] sm:rounded-card sm:max-w-xl"
            : "rounded-t-[28px] sm:rounded-card sm:max-w-lg"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-border p-4 sm:p-5 sticky top-0 z-10 bg-ground">
          <div>
            <h2 className="text-base sm:text-lg font-black text-ink tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted mt-0.5 font-medium">
                {description}
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 !p-0 !rounded-full shrink-0"
          >
            ✕
          </Button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

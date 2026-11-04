import * as React from "react";

export interface FieldProps {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  error,
  description,
  required,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ink tracking-tight">
          {label}
        </label>
        {required && (
          <span className="text-[11px] font-medium text-muted">
            Required
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted leading-tight">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="text-xs font-medium text-danger bg-danger-subtle border border-danger/20 rounded-control px-2.5 py-1">
          {error}
        </p>
      )}
    </div>
  );
}

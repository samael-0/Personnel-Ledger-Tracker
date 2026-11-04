import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", hasError = false, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={`w-full bg-surface text-ink placeholder:text-muted/60 text-sm font-semibold px-4 py-3 border-2 ${
          hasError
            ? "border-neo-coral bg-rose-50/50"
            : "border-border focus:border-border"
        } rounded-btn shadow-neo-sm focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "cyan"
    | "purple"
    | "coral"
    | "neutral"
    | "quiet"
    | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const base =
      "font-bold inline-flex items-center justify-center border-2 border-border transition-all duration-100 select-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none";

    const variantStyles = {
      primary:
        "bg-neo-yellow text-ink shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      secondary:
        "bg-surface text-ink shadow-neo hover:bg-surface-subtle hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      cyan: "bg-neo-cyan text-ink shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      purple:
        "bg-neo-purple text-ink shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      coral:
        "bg-neo-coral text-ink shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
      neutral:
        "bg-surface text-ink border-2 border-border shadow-neo-sm hover:bg-surface-subtle active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
      quiet:
        "bg-transparent text-muted hover:text-ink hover:bg-surface-subtle border-transparent shadow-none",
      danger:
        "bg-neo-coral text-ink shadow-neo hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
    };

    const sizeStyles =
      size === "sm"
        ? "px-3 py-1.5 text-xs rounded-btn"
        : size === "lg"
          ? "px-6 py-3.5 text-base rounded-btn"
          : "px-4 py-2.5 text-sm rounded-btn";

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${base} ${variantStyles[variant]} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

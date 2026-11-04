import * as React from "react";

export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-btn bg-surface-subtle border border-border/15 ${className}`}
      {...props}
    />
  );
}


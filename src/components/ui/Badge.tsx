import { HTMLAttributes } from "react";
import { clsx } from "clsx";

type BadgeVariant = "accent" | "success" | "muted" | "destructive";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  accent: "bg-accent-light text-accent",
  success: "bg-success/10 text-success",
  muted: "bg-border text-text-secondary",
  destructive: "bg-destructive/10 text-destructive",
};

function Badge({ className, variant = "accent", children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx("badge", variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
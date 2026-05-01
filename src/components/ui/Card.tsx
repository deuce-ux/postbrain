import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type CardVariant = "default" | "hover" | "elevated";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

interface CardHeaderProps {
  title?: string;
  action?: ReactNode;
  className?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: "card",
  hover: "card-hover cursor-pointer",
  elevated: "bg-surface rounded-card shadow-card-elevated border border-border",
};

function Card({ className, variant = "default", children, ...props }: CardProps) {
  return (
    <div className={clsx(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}

function CardHeader({ title, action, className }: CardHeaderProps) {
  return (
    <div className={clsx("flex items-center justify-between p-4 border-b border-border", className)}>
      {title && <h3 className="font-serif text-lg text-text-primary">{title}</h3>}
      {action && <div>{action}</div>}
    </div>
  );
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-4", className)} {...props}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("p-4 border-t border-border", className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardContent, CardFooter };
export type { CardProps, CardVariant, CardHeaderProps };
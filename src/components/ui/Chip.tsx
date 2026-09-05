import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChipVariant = "gold" | "outline" | "ash";

export interface ChipProps {
  variant?: ChipVariant;
  className?: string;
  children: ReactNode;
}

export function Chip({ variant = "outline", className, children }: ChipProps) {
  if (variant === "gold") {
    return (
      <span className={cn("inline-flex chamfer-sm bg-gold px-2 py-1.5 label text-obsidian", className)}>{children}</span>
    );
  }
  return (
    <span className={cn("inline-flex chamfer-sm bg-hairline p-px", className)}>
      <span className={cn("chamfer-sm bg-charcoal px-2 py-1.5 label", variant === "ash" ? "text-smoke" : "text-ash")}>
        {children}
      </span>
    </span>
  );
}

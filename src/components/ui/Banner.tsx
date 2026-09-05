import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BannerTone = "offline" | "error" | "gold" | "info";

export interface BannerProps {
  tone?: BannerTone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Banner({ tone = "info", action, className, children }: BannerProps) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center justify-between gap-3 px-4 py-2 label",
        tone === "offline" && "bg-graphite text-ash",
        tone === "error" && "bg-graphite text-signal",
        tone === "gold" && "bg-gold text-obsidian",
        tone === "info" && "bg-charcoal text-bone",
        className,
      )}
      role="status"
    >
      <span className="truncate">{children}</span>
      {action}
    </div>
  );
}

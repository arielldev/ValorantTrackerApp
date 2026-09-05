import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Edge = "hairline" | "gold" | "none";
export type Corner = "tr" | "bl";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  edge?: Edge;
  corner?: Corner;
  small?: boolean;
  surface?: string;
  innerClassName?: string;
  children?: ReactNode;
}

export function clipFor(corner: Corner, small: boolean): string {
  if (corner === "bl") return "chamfer-bl";
  return small ? "chamfer-sm" : "chamfer";
}

export function Panel({
  edge = "hairline",
  corner = "tr",
  small = false,
  surface = "bg-charcoal",
  innerClassName,
  className,
  children,
  ...rest
}: PanelProps) {
  const clip = clipFor(corner, small);
  return (
    <div
      className={cn(
        "relative p-px",
        clip,
        edge === "gold" && "gold-gradient",
        edge === "hairline" && "bg-hairline",
        edge === "none" && "bg-transparent p-0",
        className,
      )}
      {...rest}
    >
      <div className={cn("relative h-full w-full", clip, surface, innerClassName)}>{children}</div>
    </div>
  );
}

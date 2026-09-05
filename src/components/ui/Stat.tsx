import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Display, Label, type DisplaySize } from "./Text";

export interface StatProps {
  label: string;
  value: ReactNode;
  size?: DisplaySize;
  tone?: "bone" | "gold";
  align?: "left" | "right";
  className?: string;
}

export function Stat({ label, value, size = "d2", tone = "bone", align = "left", className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", align === "right" && "items-end text-right", className)}>
      <Label>{label}</Label>
      <Display size={size} tone={tone} tabular>
        {value}
      </Display>
    </div>
  );
}

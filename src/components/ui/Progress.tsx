import { cn } from "@/lib/cn";

export interface ProgressProps {
  fraction: number;
  thick?: boolean;
  drain?: boolean;
  className?: string;
}

export function Progress({ fraction, thick = false, drain = false, className }: ProgressProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div className={cn("w-full bg-graphite", thick ? "h-1.5" : "h-px", className)}>
      <div
        className={cn("h-full gold-gradient-h", drain && "ml-auto")}
        style={{ width: `${pct}%`, transition: "width 1s linear" }}
      />
    </div>
  );
}

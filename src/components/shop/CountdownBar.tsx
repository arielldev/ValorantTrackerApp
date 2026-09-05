import { useEffect, useState } from "react";
import { useCountdown } from "@/hooks/useCountdown";
import { fmtCountdown } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Display, Label } from "@/components/ui";

export interface CountdownBarProps {
  expiresAt: number | null;
  totalSeconds?: number;
  label?: string;
  segments?: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function CountdownBar({ expiresAt, totalSeconds = 86400, label = "Resets in", segments = 24 }: CountdownBarProps) {
  const { remaining, fraction } = useCountdown(expiresAt, totalSeconds);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  const urgent = expiresAt !== null && remaining > 0 && remaining < 3600;
  const resetAt = expiresAt ? new Date(expiresAt * 1000) : null;

  return (
    <div className="-mx-4 flex flex-col gap-2 md:mx-0">
      <div className="flex items-end justify-between px-4 md:px-0">
        <div className="flex flex-col gap-1">
          <Label>{label}</Label>
          {resetAt ? (
            <span className="text-micro text-smoke tabular">
              at {pad(resetAt.getHours())}:{pad(resetAt.getMinutes())} your time
            </span>
          ) : null}
        </div>
        <Display size="d2" tabular className={cn("leading-none", urgent && "text-signal")}>
          {expiresAt ? fmtCountdown(remaining) : "--:--:--"}
        </Display>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden bg-graphite md:chamfer-sm">
        <div
          className={cn("absolute inset-y-0 left-0 gold-gradient-h", urgent && "bg-signal")}
          style={{ width: `${pct}%`, transition: animate ? "width 1s linear" : "none", background: urgent ? "var(--color-signal)" : undefined }}
        >
          <span className="absolute inset-y-0 right-0 w-1 bg-gold-bright shadow-[0_0_12px_3px_rgba(234,210,122,0.55)]" />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent calc(${100 / segments}% - 1px), var(--color-obsidian) calc(${100 / segments}% - 1px), var(--color-obsidian) ${100 / segments}%)`,
          }}
        />
      </div>
    </div>
  );
}

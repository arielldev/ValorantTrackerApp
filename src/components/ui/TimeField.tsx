import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { Select } from "./Select";

export interface TimeFieldProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  disabled?: boolean;
  className?: string;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: pad(h) }));
const MINUTES = Array.from({ length: 12 }, (_, i) => ({ value: String(i * 5), label: pad(i * 5) }));

export function TimeField({ hour, minute, onChange, disabled = false, className }: TimeFieldProps) {
  const snapped = Math.round(minute / 5) * 5;
  const minuteOptions = MINUTES.some((m) => m.value === String(minute)) ? MINUTES : [...MINUTES, { value: String(minute), label: pad(minute) }].sort((a, b) => Number(a.value) - Number(b.value));
  return (
    <div className={cn("flex items-center gap-1", disabled && "pointer-events-none opacity-50", className)}>
      <Select
        aria-label="Hour"
        value={String(hour)}
        options={HOURS}
        onChange={(v) => {
          sfx.play("click");
          onChange(Number(v), minute);
        }}
        className="font-display text-d3"
      />
      <span className="display text-d3 text-ash">:</span>
      <Select
        aria-label="Minute"
        value={String(minuteOptions.some((m) => m.value === String(minute)) ? minute : snapped)}
        options={minuteOptions}
        onChange={(v) => {
          sfx.play("click");
          onChange(hour, Number(v));
        }}
        className="font-display text-d3"
      />
    </div>
  );
}

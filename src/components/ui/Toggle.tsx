import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        sfx.play("click");
        onChange(!checked);
      }}
      className={cn(
        "relative h-7 w-12 shrink-0 chamfer-sm transition-colors duration-150 md:hover:brightness-110",
        checked ? "gold-gradient" : "bg-graphite ring-1 ring-inset ring-hairline",
        disabled && "opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("absolute top-1 h-5 w-5 transition-[left] duration-150", checked ? "bg-obsidian" : "bg-ash")}
        style={{ left: checked ? 24 : 4 }}
      />
    </button>
  );
}

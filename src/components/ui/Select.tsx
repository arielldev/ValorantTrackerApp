import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
  align?: "left" | "right";
}

export function Select({ options, value, onChange, className, align = "right", "aria-label": ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    setCursor(idx);
    requestAnimationFrame(() => {
      list.current?.children[idx]?.scrollIntoView({ block: "nearest" });
    });
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open, options, value]);

  function pick(v: string) {
    sfx.play("click");
    onChange(v);
    setOpen(false);
  }

  function onKey(e: KeyboardEvent) {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(options.length - 1, c + 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      pick(options[cursor].value);
    }
  }

  return (
    <div ref={root} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={id}
        onClick={() => {
          sfx.play(open ? "close" : "open");
          setOpen((o) => !o);
        }}
        onPointerEnter={() => canHover && sfx.play("hover")}
        onKeyDown={onKey}
        className={cn("inline-flex chamfer-sm p-px transition-colors", open ? "gold-gradient" : "bg-hairline md:hover:bg-gold/60")}
      >
        <span className="flex h-10 min-w-20 items-center justify-between gap-3 chamfer-sm bg-graphite pl-3 pr-2 text-small text-bone tabular">
          <span className="truncate">{current?.label}</span>
          <ChevronDown size={16} strokeWidth={1.5} className={cn("shrink-0 text-ash transition-transform", open && "rotate-180 text-gold")} />
        </span>
      </button>
      {open ? (
        <div className={cn("absolute z-50 mt-1 min-w-full chamfer-bl bg-hairline p-px animate-fade", align === "right" ? "right-0" : "left-0")}>
          <ul
            id={id}
            ref={list}
            role="listbox"
            className="max-h-64 min-w-40 overflow-y-auto chamfer-bl bg-charcoal py-1 no-scrollbar"
          >
            {options.map((o, i) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(o.value)}
                  onPointerEnter={() => {
                    setCursor(i);
                    if (canHover) sfx.play("hover");
                  }}
                  className={cn(
                    "flex h-9 cursor-pointer items-center justify-between gap-4 px-3 text-small tabular",
                    selected ? "text-gold" : "text-bone",
                    cursor === i && "bg-graphite",
                  )}
                >
                  <span className={cn("absolute left-0 h-9 w-0.5", selected ? "bg-gold" : "bg-transparent")} />
                  <span>{o.label}</span>
                  {selected ? <Check size={14} strokeWidth={2} /> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

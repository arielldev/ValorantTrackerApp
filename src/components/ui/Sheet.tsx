import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  stacked?: boolean;
  depth?: number;
}

export function Sheet({ open, onClose, children, className, stacked = false, depth = 0 }: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nested = depth > 0;

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  useEffect(() => {
    if (!open || stacked) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stacked, onClose]);

  function onTouchStart(e: TouchEvent) {
    if (stacked) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }

  function onTouchEnd() {
    if (dragY > 90) onClose();
    setDragY(0);
    startY.current = null;
  }

  const closedTransform = nested ? "translate-x-full md:translate-x-[-50%] md:translate-y-[-45%] md:opacity-0 md:scale-[0.98]" : "translate-y-full md:translate-y-[-45%] md:opacity-0 md:scale-[0.98]";

  return (
    <div className={cn("fixed inset-0", nested ? "z-50" : "z-40", (!open || stacked) && "pointer-events-none")} aria-hidden={!open}>
      {!nested ? (
        <div
          className={cn("absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-[2px] transition-opacity duration-200", open ? "opacity-100" : "opacity-0")}
          onClick={onClose}
        />
      ) : (
        <div className={cn("absolute inset-0 cursor-pointer bg-black/30 transition-opacity duration-200", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      )}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex h-[90dvh] flex-col bg-charcoal transition-all duration-250 ease-out will-change-transform",
          "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:h-auto md:max-h-[calc(100dvh-5rem)] md:w-[44rem] md:-translate-x-1/2 md:-translate-y-1/2 md:chamfer md:border md:border-hairline",
          !open && closedTransform,
          open && stacked && "scale-[0.96] opacity-50 md:scale-[0.94] md:opacity-40 -translate-y-3 md:translate-y-[-52%]",
          className,
        )}
        style={open && !stacked && dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-px w-full bg-hairline md:hidden" />
        <div className="relative flex items-center justify-center py-3 md:hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          {nested ? (
            <button aria-label="Back" onClick={onClose} className="absolute left-2 top-1 flex h-9 w-9 items-center justify-center text-ash active:text-gold">
              <ChevronLeft size={20} strokeWidth={1.5} />
            </button>
          ) : null}
          <div className="h-0.5 w-10 bg-smoke" />
        </div>
        <button
          aria-label={nested ? "Back" : "Close"}
          onClick={onClose}
          className="absolute right-3 top-3 z-10 hidden h-9 w-9 items-center justify-center bg-obsidian/70 text-ash transition-colors hover:bg-signal hover:text-bone md:flex"
        >
          {nested ? <ChevronLeft size={16} strokeWidth={1.5} /> : <X size={16} strokeWidth={1.5} />}
        </button>
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain scroll-smooth no-scrollbar safe-bottom"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

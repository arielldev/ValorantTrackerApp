import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";

export interface ScreenProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  refreshing?: boolean;
  header?: ReactNode;
  padded?: boolean;
  className?: string;
}

const THRESHOLD = 72;

export function Screen({ children, onRefresh, refreshing = false, header, padded = true, className }: ScreenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);

  function onTouchStart(e: TouchEvent) {
    if (!onRefresh) return;
    if ((ref.current?.scrollTop ?? 0) > 0) return;
    startY.current = e.touches[0].clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && (ref.current?.scrollTop ?? 0) === 0) setPull(Math.min(dy * 0.5, THRESHOLD * 1.4));
  }

  async function onTouchEnd() {
    const fire = pull >= THRESHOLD;
    setPull(0);
    startY.current = null;
    if (fire && onRefresh) {
      sfx.play("refresh");
      await onRefresh();
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {header ? (
        <div className="relative z-10 shrink-0 border-b border-hairline/60 md:border-b-0">
          <div className="mx-auto w-full max-w-6xl md:px-6 md:pt-6">{header}</div>
        </div>
      ) : null}
      <div className="relative h-0.5 shrink-0 overflow-hidden bg-transparent">
        {refreshing ? <div className="absolute inset-y-0 w-1/3 gold-gradient-h animate-sweep [animation-iteration-count:infinite]" /> : null}
        {!refreshing && pull > 0 ? (
          <div className="absolute inset-y-0 left-0 gold-gradient-h" style={{ width: `${Math.min(100, (pull / THRESHOLD) * 100)}%` }} />
        ) : null}
      </div>
      <div
        ref={ref}
        className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth no-scrollbar", className)}
        style={pull ? { transform: `translateY(${pull}px)`, transition: "none" } : { transition: "transform 150ms ease-out" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className={cn("mx-auto w-full max-w-6xl", padded && "px-4 md:px-10 md:pt-2")}>
          {children}
          <div className="h-8 safe-bottom md:h-12" />
        </div>
      </div>
    </div>
  );
}

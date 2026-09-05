import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";

export interface RowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  dim?: boolean;
  interactive?: boolean;
}

export function Row({ leading, title, subtitle, trailing, dim = false, interactive, className, onClick, onPointerEnter, ...rest }: RowProps) {
  const clickable = interactive ?? !!onClick;
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        "flex min-h-16 items-center gap-3 border-b border-hairline py-3",
        clickable && "cursor-pointer active:bg-graphite/60 md:hover:bg-graphite/40",
        dim && "opacity-60",
        className,
      )}
      onClick={(e) => {
        if (clickable) sfx.play("click");
        onClick?.(e);
      }}
      onPointerEnter={(e) => {
        if (clickable && canHover) sfx.play("hover");
        onPointerEnter?.(e);
      }}
      {...rest}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-body text-bone">{title}</div>
        {subtitle ? <div className="mt-0.5 truncate text-small text-ash">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}

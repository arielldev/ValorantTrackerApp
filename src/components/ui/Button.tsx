import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  sound?: "click" | "confirm" | "error" | "none";
  icon?: ReactNode;
  children?: ReactNode;
}

const HEIGHT: Record<ButtonSize, string> = { sm: "h-9 px-4 text-[12px]", md: "h-12 px-5 text-[14px]", lg: "h-14 px-6 text-[15px]" };

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  loading = false,
  sound = "click",
  icon,
  className,
  children,
  disabled,
  onClick,
  onPointerEnter,
  ...rest
}: ButtonProps) {
  const outer = cn(
    "relative inline-flex p-px chamfer-sm select-none transition-colors",
    full && "w-full",
    variant === "primary" && "gold-gradient",
    variant === "ghost" && "bg-hairline md:hover:bg-gold/70",
    variant === "danger" && "bg-signal/70 md:hover:bg-signal",
    (disabled || loading) && "opacity-50",
    className,
  );
  const inner = cn(
    "chamfer-sm flex w-full items-center justify-center gap-2.5 font-body font-semibold uppercase tracking-[0.1em] text-white",
    HEIGHT[size],
    variant === "primary" && "bg-[linear-gradient(180deg,#D8B23A_0%,#B8891A_55%,#7A5F10_100%)] [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] active:brightness-95 md:hover:brightness-110",
    variant === "ghost" && "bg-charcoal active:bg-graphite md:hover:bg-graphite",
    variant === "danger" && "bg-charcoal text-signal active:bg-graphite md:hover:bg-graphite",
  );
  return (
    <button
      className={outer}
      disabled={disabled || loading}
      onClick={(e) => {
        if (sound !== "none") sfx.play(sound);
        onClick?.(e);
      }}
      onPointerEnter={(e) => {
        if (canHover && !disabled) sfx.play("hover");
        onPointerEnter?.(e);
      }}
      {...rest}
    >
      <span className={inner}>
        {loading ? "…" : (
          <>
            {icon ? <span className="flex shrink-0 items-center [&>svg]:h-[1.15em] [&>svg]:w-[1.15em]">{icon}</span> : null}
            {children}
          </>
        )}
      </span>
    </button>
  );
}

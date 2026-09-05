import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

export function IconButton({ label, active = false, className, children, onClick, onPointerEnter, ...rest }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn("flex h-10 w-10 items-center justify-center text-bone active:text-gold", active && "text-gold", className)}
      onClick={(e) => {
        sfx.play("click");
        onClick?.(e);
      }}
      onPointerEnter={(e) => {
        if (canHover) sfx.play("hover");
        onPointerEnter?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

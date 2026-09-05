import { useState } from "react";
import { Star as StarIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";

export interface StarProps {
  active: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}

export function Star({ active, onToggle, size = 20, className }: StarProps) {
  const [pulse, setPulse] = useState(false);
  return (
    <button
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        setPulse(true);
        sfx.play(active ? "unstar" : "star");
        onToggle();
      }}
      onPointerEnter={() => canHover && sfx.play("hover")}
      onAnimationEnd={() => setPulse(false)}
      className={cn("flex h-10 w-10 items-center justify-center transition-transform md:hover:scale-110 md:hover:text-gold", pulse && "animate-star", className)}
    >
      <StarIcon
        size={size}
        strokeWidth={1.5}
        className={cn("transition-colors", active ? "text-gold" : "text-bone")}
        fill={active ? "currentColor" : "none"}
      />
    </button>
  );
}

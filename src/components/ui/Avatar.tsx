import { cn } from "@/lib/cn";

export interface AvatarProps {
  online?: boolean;
  size?: number;
  className?: string;
}

export function Avatar({ online = true, size = 40, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }} aria-hidden="true">
      <span className="absolute inset-0 chamfer-sm bg-hairline p-px">
        <span className="flex h-full w-full chamfer-sm items-center justify-center bg-obsidian vignette">
          <img src="/logo.png" alt="" width={size * 0.7} height={size * 0.7} draggable={false} className="select-none" />
        </span>
      </span>
      <span
        className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 border-2 border-charcoal", online ? "bg-[#3BA55D]" : "bg-smoke")}
        style={{ borderRadius: 999 }}
      />
    </span>
  );
}

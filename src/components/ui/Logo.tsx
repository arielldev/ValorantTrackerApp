import { cn } from "@/lib/cn";

export interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  return <img src="/logo.png" alt="ValoStore" width={size} height={size} draggable={false} className={cn("select-none", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("display text-d3 text-bone", className)}>
      Valo<span className="text-gold">Store</span>
    </span>
  );
}

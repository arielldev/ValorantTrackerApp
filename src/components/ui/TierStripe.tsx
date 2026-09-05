import type { Tier } from "@/lib/types";
import { cn } from "@/lib/cn";

export interface TierStripeProps {
  tier: Tier | null | undefined;
  className?: string;
}

export function TierStripe({ tier, className }: TierStripeProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute inset-y-0 left-0 w-[3px]", className)}
      style={{ background: tier?.color ?? "var(--color-smoke)" }}
    />
  );
}

export function TierBadge({ tier }: { tier: Tier | null | undefined }) {
  if (!tier) return null;
  return (
    <span className="inline-flex items-center gap-1.5 label" style={{ color: tier.color }}>
      <span className="h-2 w-2" style={{ background: tier.color }} />
      {tier.name}
    </span>
  );
}

import type { Accessory } from "@/lib/types";
import { useCountdown } from "@/hooks/useCountdown";
import { fmtRemaining } from "@/lib/format";
import { HeroRule, Label } from "@/components/ui";
import { AccessoryCard } from "./AccessoryCard";

export interface AccessoryRowProps {
  items: Accessory[];
  expiresAt: number;
}

export function AccessoryRow({ items, expiresAt }: AccessoryRowProps) {
  const { remaining } = useCountdown(expiresAt, 7 * 86400);
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <HeroRule title="Accessories" meta={<Label>{fmtRemaining(remaining)}</Label>} />
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6">
        {items.map((a) => (
          <AccessoryCard key={a.uuid} item={a} />
        ))}
      </div>
    </section>
  );
}

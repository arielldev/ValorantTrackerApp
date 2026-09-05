import type { SkinOffer } from "@/lib/types";
import { Skeleton } from "@/components/ui";
import { SkinCard } from "./SkinCard";

export interface SkinGridProps {
  offers: SkinOffer[] | null;
  currency: string;
  onOpen: (skinUuid: string) => void;
  onToggleWish: (skinUuid: string, wishlisted: boolean) => void;
}

export function SkinGrid({ offers, currency, onOpen, onToggleWish }: SkinGridProps) {
  if (!offers) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] chamfer" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {offers.map((o, i) => (
        <SkinCard key={o.levelUuid} offer={o} currency={currency} index={i} onOpen={onOpen} onToggleWish={onToggleWish} />
      ))}
    </div>
  );
}

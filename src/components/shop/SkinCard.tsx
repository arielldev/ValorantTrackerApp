import type { SkinOffer } from "@/lib/types";
import { SkinTile } from "@/components/ui";

export interface SkinCardProps {
  offer: SkinOffer;
  currency: string;
  index?: number;
  onOpen: (skinUuid: string) => void;
  onToggleWish: (skinUuid: string, wishlisted: boolean) => void;
}

export function SkinCard({ offer, currency, index = 0, onOpen, onToggleWish }: SkinCardProps) {
  return (
    <SkinTile
      image={offer.image}
      name={offer.name}
      weapon={offer.weapon}
      line={offer.line}
      tier={offer.tier}
      priceVp={offer.priceVp}
      originalVp={offer.originalPriceVp}
      discount={offer.discountPercent}
      owned={offer.owned}
      wishlisted={offer.wishlisted}
      index={index}
      plan
      currency={currency}
      onOpen={() => onOpen(offer.skinUuid)}
      onToggleWish={() => onToggleWish(offer.skinUuid, offer.wishlisted)}
    />
  );
}

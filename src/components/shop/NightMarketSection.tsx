import type { NightMarket } from "@/lib/types";
import { useCountdown } from "@/hooks/useCountdown";
import { fmtRemaining } from "@/lib/format";
import { HeroRule, Label } from "@/components/ui";
import { SkinGrid } from "./SkinGrid";

export interface NightMarketSectionProps {
  market: NightMarket;
  currency: string;
  onOpen: (skinUuid: string) => void;
  onToggleWish: (skinUuid: string, wishlisted: boolean) => void;
}

export function NightMarketSection({ market, currency, onOpen, onToggleWish }: NightMarketSectionProps) {
  const { remaining } = useCountdown(market.expiresAt, 14 * 86400);
  return (
    <section className="flex flex-col gap-4">
      <HeroRule title="Night Market" meta={<Label tone="gold">{fmtRemaining(remaining)}</Label>} />
      <SkinGrid offers={market.offers} currency={currency} onOpen={onOpen} onToggleWish={onToggleWish} />
    </section>
  );
}

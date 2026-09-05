import type { Bundle, BundleItem } from "@/lib/types";
import { useCountdown } from "@/hooks/useCountdown";
import { fmtNum, fmtRemaining, isEndingSoon } from "@/lib/format";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Affordability, CurrencyIcon, Display, Img, Label, Sheet } from "@/components/ui";

export interface BundleSheetProps {
  open: boolean;
  bundle: Bundle | null;
  currency: string;
  onClose: () => void;
  onOpenSkin: (skinUuid: string) => void;
  stacked?: boolean;
  depth?: number;
}

const KIND: Record<BundleItem["kind"], string> = {
  skin: "Skin",
  chroma: "Chroma",
  buddy: "Buddy",
  spray: "Spray",
  card: "Card",
  title: "Title",
  other: "Item",
};

function Vp({ n, size = "text-d2", tone = "text-gold", icon = 18 }: { n: number; size?: string; tone?: string; icon?: number }) {
  return (
    <span className={cn("flex items-center gap-1.5 display leading-none tabular", size, tone)}>
      <span className="relative top-[0.08em]">{fmtNum(n)}</span>
      <CurrencyIcon kind="vp" size={icon} />
    </span>
  );
}

function ItemCard({ item, index, onOpen }: { item: BundleItem; index: number; onOpen?: () => void }) {
  const wide = item.kind === "skin" || item.kind === "chroma";
  return (
    <li
      className={cn("chamfer-sm bg-hairline p-px animate-rise transition-colors", onOpen && "md:hover:bg-gold/60", item.wishlisted && "gold-gradient")}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        onClick={() => {
          if (!onOpen) return;
          sfx.play("open");
          onOpen();
        }}
        onPointerEnter={() => onOpen && canHover && sfx.play("hover")}
        className={cn("group relative flex h-full chamfer-sm flex-col bg-charcoal", onOpen && "cursor-pointer active:bg-graphite/70", item.owned && "opacity-60")}
      >
        {item.kind === "title" ? (
          <div className="flex aspect-[4/3] items-center justify-center px-3 text-center display text-d3 text-bone">{item.name}</div>
        ) : (
          <Img
            src={item.image}
            alt={item.name}
            vignette={wide}
            className={cn("w-full", wide ? "aspect-[4/3] px-4 pt-4" : "aspect-[4/3] p-4", item.kind === "card" && "p-0")}
            imgClassName={cn(item.kind === "card" ? "object-cover" : "object-contain", "transition-transform duration-300 md:group-hover:scale-105")}
          />
        )}
        {item.owned ? <Label className="absolute right-3 top-3">Owned</Label> : item.wishlisted ? <Label tone="gold" className="absolute right-3 top-3">★ Wishlist</Label> : null}
        <div className="flex items-end justify-between gap-2 px-3 pb-3 pt-1">
          <div className="flex min-w-0 flex-col">
            <Label tone="ash" className="text-[10px]">
              {KIND[item.kind]}
            </Label>
            <span className="truncate text-small text-bone">{item.name.split("\n")[0]}</span>
          </div>
          {item.priceVp > 0 ? <Vp n={item.priceVp} size="text-d3" tone={item.owned ? "text-ash" : "text-gold"} icon={14} /> : null}
        </div>
      </div>
    </li>
  );
}

export function BundleSheet({ open, bundle, currency, onClose, onOpenSkin, stacked, depth }: BundleSheetProps) {
  const { remaining } = useCountdown(bundle?.expiresAt ?? null, 14 * 86400);
  return (
    <Sheet open={open} onClose={onClose} stacked={stacked} depth={depth}>
      {bundle ? (
        <div className="flex flex-col gap-5 pb-6">
          <div className="relative">
            <Img src={bundle.image} alt={bundle.name} vignette={false} className="aspect-[16/9] w-full bg-obsidian md:aspect-[21/9]" imgClassName="object-cover" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-3">
              <Label tone={isEndingSoon(remaining) || remaining <= 0 ? "signal" : "gold"}>Featured bundle · {fmtRemaining(remaining)}</Label>
              <Display as="h2" size="d1" className="text-[2.75rem] leading-[0.9]">
                {bundle.name}
              </Display>
            </div>
          </div>

          <div className="flex flex-col gap-4 px-4">
            <div className="chamfer-sm gold-gradient p-px">
              <div className="flex items-stretch justify-between chamfer-sm bg-charcoal">
                <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                  <Label>{bundle.ownedCount > 0 ? "Remaining items" : "Bundle price"}</Label>
                  <Vp n={bundle.priceVp} size="text-d1" icon={26} />
                  {bundle.ownedCount > 0 ? (
                    <span className="text-micro text-ash tabular">
                      You own {bundle.ownedCount} of {bundle.items.length} · full bundle {fmtNum(bundle.fullPriceVp)} VP
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end justify-center gap-1 border-l border-hairline px-4 py-3">
                  <Label>Separately</Label>
                  <span className="display text-d3 leading-none text-ash tabular line-through">{fmtNum(bundle.itemsTotalVp)}</span>
                  {bundle.itemsTotalVp > bundle.fullPriceVp ? (
                    <Label tone="gold">Save {fmtNum(bundle.itemsTotalVp - bundle.fullPriceVp)}</Label>
                  ) : null}
                </div>
              </div>
            </div>

            {bundle.priceVp > 0 ? <Affordability priceVp={bundle.priceVp} currency={currency} /> : null}

            <div className="flex items-center justify-between">
              <Label>Includes</Label>
              <Label>{bundle.items.length} items</Label>
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {bundle.items.map((it, i) => (
                <ItemCard key={it.uuid} item={it} index={i} onOpen={it.skinUuid ? () => onOpenSkin(it.skinUuid!) : undefined} />
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}

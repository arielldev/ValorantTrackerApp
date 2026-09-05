import type { Accessory } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CurrencyIcon, Img, Label } from "@/components/ui";

const KIND_LABEL: Record<Accessory["kind"], string> = {
  skin: "Skin",
  chroma: "Chroma",
  buddy: "Buddy",
  spray: "Spray",
  card: "Card",
  title: "Title",
  other: "Item",
};

export interface AccessoryCardProps {
  item: Accessory;
}

export function AccessoryCard({ item }: AccessoryCardProps) {
  return (
    <article className={cn("w-36 shrink-0 chamfer-sm bg-hairline p-px snap-start transition-colors md:w-auto md:hover:bg-gold/60", item.owned && "opacity-60")}>
      <div className="flex h-full chamfer-sm flex-col bg-charcoal">
        {item.kind === "title" ? (
          <div className="flex aspect-square items-center justify-center px-3 text-center display text-d3 text-bone">{item.name}</div>
        ) : (
          <Img src={item.image} alt={item.name} className={cn("aspect-square w-full p-3", item.kind === "card" && "p-0")} imgClassName={item.kind === "card" ? "object-cover" : undefined} />
        )}
        <div className="flex flex-col gap-1 px-3 pb-3">
          <Label>{item.owned ? "Owned" : KIND_LABEL[item.kind]}</Label>
          <span className="truncate text-small text-bone">{item.name}</span>
          <span className="flex items-center gap-1 display text-d3 text-gold tabular">
            {fmtNum(item.priceKc)}
            <CurrencyIcon kind="kc" size={14} />
          </span>
        </div>
      </div>
    </article>
  );
}

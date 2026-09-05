import type { Bundle } from "@/lib/types";
import { useCountdown } from "@/hooks/useCountdown";
import { fmtNum, fmtRemaining, isEndingSoon } from "@/lib/format";
import { fmtAmount, fmtPacks, packPlan } from "@/lib/currency";
import { canHover, sfx } from "@/lib/sfx";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { CurrencyIcon, Display, Img, Label } from "@/components/ui";

export interface BundleCardProps {
  bundle: Bundle;
  currency: string;
  onOpen: (bundle: Bundle) => void;
}

export function BundleCard({ bundle, currency, onOpen }: BundleCardProps) {
  const { remaining } = useCountdown(bundle.expiresAt, 14 * 86400);
  const walletVp = useApp((s) => s.wallet?.vp ?? 0);
  const plan = packPlan(bundle.priceVp, walletVp, currency);
  const urgent = remaining <= 0 || isEndingSoon(remaining);
  return (
    <article className="chamfer gold-gradient p-px animate-rise">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          sfx.play("open");
          onOpen(bundle);
        }}
        onPointerEnter={() => canHover && sfx.play("hover")}
        onKeyDown={(e) => e.key === "Enter" && onOpen(bundle)}
        className="group relative cursor-pointer chamfer bg-charcoal active:bg-graphite/70"
      >
        <Img src={bundle.image} alt={bundle.name} vignette={false} className="aspect-[21/9] w-full bg-obsidian" imgClassName="object-cover transition-transform duration-500 md:group-hover:scale-[1.03]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-charcoal via-charcoal/70 to-transparent" />
        <span className={cn("absolute left-3 top-3 flex items-center gap-1.5 chamfer-sm px-2 py-1.5 label", urgent ? "bg-signal text-bone" : "bg-obsidian/80 text-gold")}>
          <span className={cn("h-1.5 w-1.5", urgent ? "bg-bone" : "bg-gold")} />
          {fmtRemaining(remaining)}
        </span>
        {bundle.ownedCount > 0 ? (
          <Label className="absolute right-3 top-3 chamfer-sm bg-obsidian/80 px-2 py-1.5">
            You own {bundle.ownedCount}/{bundle.items.length}
          </Label>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label tone="gold">Featured bundle</Label>
              <Display size="d2" className="truncate">
                {bundle.name}
              </Display>
              <span className="text-micro text-ash tabular">
                {bundle.items.length} items · worth {fmtNum(bundle.itemsTotalVp)} VP
              </span>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              {bundle.itemsTotalVp > bundle.priceVp ? <span className="text-micro text-ash tabular line-through">{fmtNum(bundle.itemsTotalVp)}</span> : null}
              <span className="flex items-center gap-1.5 display text-d2 leading-none text-gold tabular">
                <span className="relative top-[0.08em]">{fmtNum(bundle.priceVp)}</span>
                <CurrencyIcon kind="vp" size={18} />
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-hairline/70 pt-1.5">
            {plan.coveredByWallet ? (
              <span className="label text-[9px] text-gold-bright">Affordable now</span>
            ) : (
              <>
                <span className="text-[10px] text-signal tabular">−{fmtNum(plan.needVp)} VP</span>
                <span className="truncate text-[10px] text-ash tabular">
                  {fmtPacks(plan.packs)} · {fmtAmount(plan.cost, currency)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

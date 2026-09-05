import type { ReactNode } from "react";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Img } from "./Img";
import { Star } from "./Star";
import { Label } from "./Text";
import { CurrencyIcon, TierIcon } from "./Currency";
import { GradeEmblem } from "./HypeMeter";
import { skinHype } from "@/lib/rating";
import { fmtNum } from "@/lib/format";
import { useApp } from "@/lib/store";
import { fmtAmount, fmtPacks, packPlan } from "@/lib/currency";

export interface SkinTileProps {
  image: string | null | undefined;
  name: string;
  weapon: string;
  line: string;
  tier: Tier | null | undefined;
  priceVp?: number | null;
  originalVp?: number | null;
  discount?: number | null;
  unit?: "vp" | "kc";
  owned?: boolean;
  wishlisted?: boolean;
  index?: number;
  size?: "sm" | "md";
  badge?: ReactNode;
  corner?: ReactNode;
  sub?: ReactNode;
  plan?: boolean;
  currency?: string;
  hype?: boolean;
  onOpen: () => void;
  onToggleWish?: () => void;
  className?: string;
}

export function SkinTile({
  image,
  name,
  weapon,
  line,
  tier,
  priceVp,
  originalVp,
  discount,
  unit = "vp",
  owned = false,
  wishlisted = false,
  index = 0,
  size = "md",
  badge,
  corner,
  sub,
  plan = false,
  currency = "EUR",
  hype = true,
  onOpen,
  onToggleWish,
  className,
}: SkinTileProps) {
  const small = size === "sm";
  const walletVp = useApp((s) => s.wallet?.vp ?? 0);
  const h = hype ? skinHype(name, line, weapon) : null;
  const p = plan && priceVp != null && !owned && unit === "vp" ? packPlan(priceVp, walletVp, currency) : null;
  return (
    <article
      className={cn("relative chamfer bg-hairline p-px animate-rise transition-colors md:hover:bg-gold/70", wishlisted && "gold-gradient", className)}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms`, borderLeft: `3px solid ${tier?.color ?? "var(--color-smoke)"}` }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          sfx.play("open");
          onOpen();
        }}
        onPointerEnter={() => canHover && sfx.play("hover")}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className="group relative flex h-full cursor-pointer chamfer flex-col bg-charcoal transition-colors active:bg-graphite/70 md:hover:bg-graphite/50"
        style={{ background: `radial-gradient(80% 60% at 50% 40%, ${tier?.color ?? "#C9A227"}14, transparent), var(--color-charcoal)` }}
      >
        <div className="absolute left-2.5 top-2.5 z-10 flex h-6 items-center gap-2">
          <TierIcon src={tier?.icon} name={tier?.name} size={small ? 18 : 22} />
          {h ? <GradeEmblem tier={h.tier} size={small ? 20 : 24} title={`Community grade ${h.tier} · ${h.score}/100`} /> : null}
          {badge}
        </div>
        <div className="absolute right-0 top-0 z-10">
          {corner !== undefined ? (
            corner
          ) : owned ? (
            <Label className="mr-3 mt-3 block">Owned</Label>
          ) : onToggleWish ? (
            <Star active={wishlisted} onToggle={onToggleWish} />
          ) : null}
        </div>
        <Img
          src={image}
          alt={name}
          dim={owned}
          vignette={false}
          className={cn("w-full bg-transparent", small ? "aspect-[4/3] px-4 pt-9" : "aspect-[4/3] px-5 pt-10")}
          imgClassName="object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] transition-transform duration-300 md:group-hover:scale-105"
        />
        <div className={cn("flex flex-col gap-1 px-3 pb-3", small ? "pt-1" : "pt-2")}>
          <div className="flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col">
              <Label tone="ash" className="text-[10px]">
                {weapon}
              </Label>
              <span className={cn("display truncate", small ? "text-d3" : "text-d3 md:text-d2", owned && "text-ash")}>{line}</span>
              {sub}
            </div>
            {priceVp != null ? (
              <div className="flex shrink-0 flex-col items-end">
                {originalVp && originalVp > priceVp ? <span className="text-micro text-ash tabular line-through">{fmtNum(originalVp)}</span> : null}
                <span className={cn("flex items-center gap-1.5 display leading-none tabular", small ? "text-d3" : "text-d2", owned ? "text-ash" : "text-gold")}>
                  <span className="relative top-[0.08em]">{fmtNum(priceVp)}</span>
                  <CurrencyIcon kind={unit} size={small ? 14 : 18} />
                </span>
                {discount ? <span className="label text-gold-bright">-{discount}%</span> : null}
              </div>
            ) : null}
          </div>
          {p ? (
            <div className="flex items-center justify-between gap-2 border-t border-hairline/70 pt-1.5">
              {p.coveredByWallet ? (
                <span className="label text-[9px] text-gold-bright">Affordable now</span>
              ) : (
                <>
                  <span className="text-[10px] text-signal tabular">−{fmtNum(p.needVp)} VP</span>
                  <span className="truncate text-[10px] text-ash tabular">
                    {fmtPacks(p.packs)} · {fmtAmount(p.cost, currency)}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

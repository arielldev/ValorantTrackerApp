import { fmtAmount, fmtMoney, fmtPacks, packPlan } from "@/lib/currency";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useApp } from "@/lib/store";
import { Display, type DisplaySize } from "./Text";
import { CurrencyIcon } from "./Currency";

export interface PriceProps {
  vp: number;
  currency: string;
  original?: number | null;
  discount?: number | null;
  size?: DisplaySize;
  unit?: "VP" | "KC";
  align?: "left" | "right";
  plan?: boolean;
  className?: string;
}

const ICON: Record<DisplaySize, number> = { d1: 28, d2: 20, d3: 16 };

export function Price({ vp, currency, original, discount, size = "d3", unit = "VP", align = "left", plan = true, className }: PriceProps) {
  const walletVp = useApp((s) => s.wallet?.vp ?? 0);
  let subline: string | null = null;
  let sublineTone = "text-ash";
  if (unit === "VP") {
    if (plan) {
      const p = packPlan(vp, walletVp, currency);
      if (p.coveredByWallet) {
        subline = "Covered by your VP";
        sublineTone = "text-gold";
      } else {
        subline = `${fmtAmount(p.cost, currency)} · ${fmtPacks(p.packs)}`;
      }
    } else {
      subline = fmtMoney(vp, currency);
    }
  }
  return (
    <div className={cn("flex flex-col", align === "right" && "items-end text-right", className)}>
      <div className="flex items-center gap-2">
        <Display size={size} tone="gold" tabular className="flex items-center gap-1.5 leading-none">
          <span className="relative top-[0.08em]">{fmtNum(vp)}</span>
          <CurrencyIcon kind={unit === "VP" ? "vp" : "kc"} size={ICON[size]} />
        </Display>
        {original && original > vp ? <span className="text-micro text-ash tabular line-through">{fmtNum(original)}</span> : null}
        {discount ? <span className="label text-gold-bright">-{discount}%</span> : null}
      </div>
      {subline ? <span className={cn("text-micro tabular", sublineTone)}>{subline}</span> : null}
    </div>
  );
}

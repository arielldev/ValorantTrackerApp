import { useApp } from "@/lib/store";
import { fmtAmount, fmtPacks, packPlan } from "@/lib/currency";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Label } from "./Text";
import { CurrencyIcon } from "./Currency";

export interface AffordabilityProps {
  priceVp: number;
  currency: string;
  className?: string;
}

function Vp({ n, tone }: { n: number; tone: string }) {
  return (
    <span className={cn("flex items-center gap-1 display text-d3 leading-none tabular", tone)}>
      <span className="relative top-[0.08em]">{fmtNum(n)}</span>
      <CurrencyIcon kind="vp" size={14} />
    </span>
  );
}

export function Affordability({ priceVp, currency, className }: AffordabilityProps) {
  const walletVp = useApp((s) => s.wallet?.vp ?? 0);
  const plan = packPlan(priceVp, walletVp, currency);
  return (
    <div className={cn("chamfer-sm bg-hairline p-px", className)}>
      <div className="flex flex-col gap-2.5 chamfer-sm bg-graphite/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <Label>You have</Label>
          <Vp n={walletVp} tone="text-bone" />
        </div>
        {plan.coveredByWallet ? (
          <div className="flex items-center justify-between">
            <Label tone="gold">Covered · left after</Label>
            <Vp n={walletVp - priceVp} tone="text-gold" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Label>Missing</Label>
              <Vp n={plan.needVp} tone="text-signal" />
            </div>
            <div className="h-px bg-hairline" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <Label tone="gold">Buy</Label>
                <span className="text-small text-bone tabular">{fmtPacks(plan.packs)} VP</span>
              </div>
              <span className="display text-d2 leading-none text-gold tabular">{fmtAmount(plan.cost, currency)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

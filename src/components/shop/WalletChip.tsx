import type { Wallet } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { CurrencyIcon, Skeleton } from "@/components/ui";

export interface WalletChipProps {
  wallet: Wallet | null;
}

export function WalletChip({ wallet }: WalletChipProps) {
  if (!wallet) return <Skeleton className="h-5 w-40" />;
  return (
    <div className="flex items-center gap-2.5 text-small text-bone tabular">
      <span className="flex items-center gap-1 font-semibold text-gold">
        {fmtNum(wallet.vp)}
        <CurrencyIcon kind="vp" size={14} />
      </span>
      <span className="flex items-center gap-1">
        {fmtNum(wallet.rp)}
        <CurrencyIcon kind="rp" size={14} />
      </span>
      <span className="flex items-center gap-1">
        {fmtNum(wallet.kc)}
        <CurrencyIcon kind="kc" size={14} />
      </span>
    </div>
  );
}

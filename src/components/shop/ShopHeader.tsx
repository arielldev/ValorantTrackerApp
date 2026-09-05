import { RefreshCw } from "lucide-react";
import type { Player, Wallet } from "@/lib/types";
import { fmtAgo, fmtNum } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { CurrencyIcon, IconButton, Label, Logo, Display, Stat } from "@/components/ui";
import { WalletChip } from "./WalletChip";
import { cn } from "@/lib/cn";

export interface ShopHeaderProps {
  player: Player | null;
  wallet: Wallet | null;
  fetchedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
}

export function ShopHeader({ player, wallet, fetchedAt, refreshing, onRefresh }: ShopHeaderProps) {
  const now = useNow(30000);
  return (
    <header className="flex items-start justify-between gap-3 px-4 pb-4 safe-top md:items-end md:px-10 md:pb-6">
      <div className="flex items-center gap-3 md:gap-5">
        <Logo size={44} className="md:hidden" />
        <div className="flex flex-col gap-1 md:gap-2">
          <Label className="hidden md:block">Store</Label>
          <Display as="h1" size="d3" className="leading-none md:text-d1">
            {player ? (
              <>
                {player.gameName}
                <span className="text-ash">#{player.tagLine}</span>
              </>
            ) : (
              "ValoStore"
            )}
          </Display>
          <div className="md:hidden">
            <WalletChip wallet={wallet} />
          </div>
        </div>
      </div>
      <div className="flex items-end gap-8">
        <div className="hidden items-end gap-8 md:flex">
          <Stat label="Valorant Points" value={<span className="flex items-center gap-1.5">{wallet ? fmtNum(wallet.vp) : "—"}<CurrencyIcon kind="vp" size={20} /></span>} tone="gold" size="d2" align="right" />
          <Stat label="Radianite" value={<span className="flex items-center gap-1.5">{wallet ? fmtNum(wallet.rp) : "—"}<CurrencyIcon kind="rp" size={20} /></span>} size="d2" align="right" />
          <Stat label="Kingdom Credits" value={<span className="flex items-center gap-1.5">{wallet ? fmtNum(wallet.kc) : "—"}<CurrencyIcon kind="kc" size={20} /></span>} size="d2" align="right" />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <IconButton label="Refresh" onClick={onRefresh} className={cn("-mr-2 -mt-1 md:mt-0", refreshing && "text-gold")}>
            <RefreshCw size={18} strokeWidth={1.5} className={cn(refreshing && "animate-spin")} />
          </IconButton>
          {fetchedAt ? <Label className="text-[10px]">Updated {fmtAgo(fetchedAt, now)}</Label> : null}
        </div>
      </div>
    </header>
  );
}

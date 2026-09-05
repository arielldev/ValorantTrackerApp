import { Clock3, LayoutGrid, Settings2, ShoppingBag, Star } from "lucide-react";
import type { Player, Tab } from "@/lib/types";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Avatar, Label } from "@/components/ui";

interface NavDef {
  id: Tab;
  label: string;
  Icon: typeof ShoppingBag;
}

const NAV: NavDef[] = [
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "wishlist", label: "Wishlist", Icon: Star },
  { id: "collection", label: "Collection", Icon: LayoutGrid },
  { id: "history", label: "History", Icon: Clock3 },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export interface SideNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  player: Player | null;
  badge?: Partial<Record<Tab, number>>;
}

export function SideNav({ active, onChange, player, badge }: SideNavProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-hairline bg-charcoal">
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-4" aria-label="Sections">
        {NAV.map(({ id, label, Icon }) => {
          const on = id === active;
          const count = badge?.[id];
          return (
            <button
              key={id}
              aria-current={on ? "page" : undefined}
              onClick={() => {
                if (on) return;
                sfx.play("tab");
                onChange(id);
              }}
              onPointerEnter={() => canHover && !on && sfx.play("hover")}
              className={cn(
                "relative flex h-11 items-center gap-3 px-3 text-left transition-colors",
                on ? "bg-graphite text-gold" : "text-ash hover:bg-graphite/60 hover:text-bone",
              )}
            >
              <span className={cn("absolute inset-y-2 left-0 w-0.5", on ? "bg-gold" : "bg-transparent")} />
              <Icon size={18} strokeWidth={1.5} />
              <span className="label text-[12px]">{label}</span>
              {count ? <span className="ml-auto min-w-5 bg-gold px-1.5 text-center text-[10px] font-semibold leading-5 text-obsidian">{count}</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 border-t border-hairline px-4 py-4">
        <Avatar online={!!player} size={40} />
        {player ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-small font-semibold text-bone">
              {player.gameName}
              <span className="font-normal text-ash">#{player.tagLine}</span>
            </span>
            <span className="flex items-center gap-1.5 label text-[10px] text-ash">
              <span className="h-1.5 w-1.5 bg-[#3BA55D]" />Online · {player.region}
            </span>
          </div>
        ) : (
          <Label>Not signed in</Label>
        )}
      </div>
    </aside>
  );
}

import { Clock3, LayoutGrid, Settings2, ShoppingBag, Star } from "lucide-react";
import type { Tab } from "@/lib/types";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { haptics } from "@/lib/haptics";

interface TabDef {
  id: Tab;
  label: string;
  Icon: typeof ShoppingBag;
}

const TABS: TabDef[] = [
  { id: "shop", label: "Shop", Icon: ShoppingBag },
  { id: "wishlist", label: "Wishlist", Icon: Star },
  { id: "collection", label: "Skins", Icon: LayoutGrid },
  { id: "history", label: "History", Icon: Clock3 },
  { id: "settings", label: "Settings", Icon: Settings2 },
];

export interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  badge?: Partial<Record<Tab, number>>;
}

export function TabBar({ active, onChange, badge }: TabBarProps) {
  return (
    <nav className="shrink-0 border-t border-hairline bg-charcoal safe-bottom" aria-label="Sections">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {TABS.map(({ id, label, Icon }) => {
          const on = id === active;
          const count = badge?.[id];
          return (
            <li key={id} className="min-w-0">
              <button
                aria-current={on ? "page" : undefined}
                onClick={() => {
                  if (on) return;
                  sfx.play("tab");
                  haptics.tap();
                  onChange(id);
                }}
                onPointerEnter={() => canHover && !on && sfx.play("hover")}
                className={cn("relative flex h-14 w-full flex-col items-center justify-center gap-1", on ? "text-gold" : "text-ash active:text-bone")}
              >
                <span className={cn("absolute inset-x-4 top-0 h-0.5", on ? "bg-gold" : "bg-transparent")} />
                <span className="relative flex h-6 items-center">
                  <Icon size={22} strokeWidth={1.5} />
                  {count ? (
                    <span className="absolute -right-2.5 -top-1 min-w-4 bg-gold px-1 text-center text-[9px] font-semibold leading-4 text-obsidian">
                      {count}
                    </span>
                  ) : null}
                </span>
                <span className="label whitespace-nowrap text-[9.5px] tracking-[0.08em]">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

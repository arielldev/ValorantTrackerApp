import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { Weapon, WishState, WishlistItem } from "@/lib/types";
import { fmtDays, fmtNum } from "@/lib/format";
import { fmtMoney } from "@/lib/currency";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Chip, Display, EmptyState, Glyph, HeroRule, Label, Progress, Screen, Skeleton, SkinTile } from "@/components/ui";

function StateChip({ state }: { state: WishState }) {
  switch (state.kind) {
    case "in_shop":
      return <Chip variant="gold">In shop today</Chip>;
    case "night_market":
      return <Chip>Night market −{state.discountPercent}%</Chip>;
    case "in_bundle":
      return <Chip>In bundle</Chip>;
    case "last_seen":
      return <Chip variant="ash">Last seen {fmtDays(state.days)}</Chip>;
    default:
      return <Chip variant="ash">Never seen</Chip>;
  }
}

function WishCard({ item, currency, index, onOpen, onToggle }: { item: WishlistItem; currency: string; index: number; onOpen: () => void; onToggle: () => void }) {
  return (
    <li>
      <SkinTile
        image={item.image}
        name={item.name}
        weapon={item.weapon}
        line={item.line}
        tier={item.tier}
        priceVp={item.priceVp}
        owned={item.owned}
        wishlisted
        index={index}
        plan
        currency={currency}
        badge={<StateChip state={item.state} />}
        onOpen={onOpen}
        onToggleWish={onToggle}
      />
    </li>
  );
}

function WeaponCard({ weapon, onOpen }: { weapon: Weapon; onOpen: () => void }) {
  const done = weapon.totalSkins > 0 && weapon.ownedSkins === weapon.totalSkins;
  return (
    <li className="chamfer-sm bg-hairline p-px transition-colors md:hover:bg-gold/60">
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          sfx.play("open");
          onOpen();
        }}
        onPointerEnter={() => canHover && sfx.play("hover")}
        onKeyDown={(e) => e.key === "Enter" && onOpen()}
        className="group relative flex h-full cursor-pointer chamfer-sm flex-col bg-charcoal active:bg-graphite/70"
      >
        <div className="aspect-video w-full px-6 pt-5 pb-1 vignette transition-transform duration-300 md:group-hover:scale-105">
          <Glyph src={weapon.image} alt={weapon.name} className="h-full w-full" tone={weapon.ownedSkins > 0 ? "gold" : "smoke"} />
        </div>
        {weapon.wishlistedSkins > 0 ? (
          <span className="absolute right-3 top-3 flex items-center gap-1 label text-gold">
            ★ {weapon.wishlistedSkins}
          </span>
        ) : null}
        <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="display text-d3 truncate">{weapon.name}</span>
            <span className={cn("display text-d3 tabular shrink-0", done ? "text-gold" : "text-bone")}>
              {weapon.ownedSkins} <span className="text-ash">/ {weapon.totalSkins}</span>
            </span>
          </div>
          <Progress fraction={weapon.ownedSkins / Math.max(1, weapon.totalSkins)} />
          <Label className="text-[10px]">{weapon.category}</Label>
        </div>
      </div>
    </li>
  );
}

export function Wishlist() {
  const wishlist = useApp((s) => s.wishlist);
  const weapons = useApp((s) => s.weapons);
  const settings = useApp((s) => s.settings);
  const openSkin = useApp((s) => s.openSkin);
  const openWeapon = useApp((s) => s.openWeapon);
  const toggleWish = useApp((s) => s.toggleWish);
  const loadWishlist = useApp((s) => s.loadWishlist);
  const loadWeapons = useApp((s) => s.loadWeapons);

  const items = wishlist?.items ?? [];
  const [query, setQuery] = useState("");
  const visibleWeapons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (weapons ?? []).filter((w) => !q || w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q));
  }, [weapons, query]);
  const totals = useMemo(() => {
    if (!weapons) return null;
    return weapons.reduce((a, w) => ({ owned: a.owned + w.ownedSkins, total: a.total + w.totalSkins }), { owned: 0, total: 0 });
  }, [weapons]);

  return (
    <Screen
      onRefresh={async () => {
        await Promise.all([loadWishlist(), loadWeapons()]);
      }}
      header={
        <div className="flex items-end justify-between px-4 pb-3 safe-top md:px-10">
          <div className="flex flex-col gap-1">
            <Label className="hidden md:block">Wishlist</Label>
            <Display as="h1" size="d1">
              Wishlist
            </Display>
          </div>
          {totals ? (
            <div className="flex flex-col items-end gap-1">
              <Label>Skins owned</Label>
              <span className="display text-d2 tabular text-gold">
                {fmtNum(totals.owned)} <span className="text-ash">/ {fmtNum(totals.total)}</span>
              </span>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-8 pt-1 md:gap-10">
        <ErrorBanner />
        <section className="flex flex-col gap-4">
          <HeroRule title="Starred" meta={<Label>{items.length}</Label>} />
          {items.length === 0 ? (
            <EmptyState text="Open a weapon below and star the skins you want." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {items.map((it, i) => (
                <WishCard key={it.skinUuid} item={it} currency={settings.currency} index={i} onOpen={() => openSkin(it.skinUuid)} onToggle={() => toggleWish(it.skinUuid, true)} />
              ))}
            </ul>
          )}
          {wishlist && items.length > 0 ? (
            <footer className="flex items-center justify-between pt-2">
              <Label>Total</Label>
              <span className="display text-d2 text-gold tabular">
                {fmtNum(wishlist.totalVp)} VP <span className="text-d3 text-ash">· {fmtMoney(wishlist.totalVp, settings.currency)}</span>
              </span>
            </footer>
          ) : null}
        </section>

        <section className="flex flex-col gap-4">
          <HeroRule title="All weapons" meta={weapons ? <Label>{visibleWeapons.length}</Label> : undefined} />
          <label className="flex h-11 items-center chamfer-sm bg-hairline p-px md:max-w-sm">
            <span className="flex h-full w-full items-center gap-2 chamfer-sm bg-graphite px-3">
              <Search size={16} strokeWidth={1.5} className="shrink-0 text-ash" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search weapons" className="w-full bg-transparent text-small text-bone outline-none placeholder:text-smoke" />
            </span>
          </label>
          {!weapons ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3]" />
              ))}
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {visibleWeapons.map((w) => (
                <WeaponCard key={w.uuid} weapon={w} onOpen={() => openWeapon(w.uuid)} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </Screen>
  );
}

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { SkinLine } from "@/lib/types";
import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/cn";
import { skinHype } from "@/lib/rating";
import { sfx } from "@/lib/sfx";
import { CurrencyIcon, Display, EmptyState, HeroRule, Img, Label, Progress, Screen, Skeleton, SkinTile, Stat } from "@/components/ui";
import { currency, fmtAmount } from "@/lib/currency";

type Sort = "weapon" | "tier" | "popularity";

function LineCard({ line, index, onOpen }: { line: SkinLine; index: number; onOpen: () => void }) {
  const done = line.owned === line.total;
  return (
    <li>
      <SkinTile
        image={line.image}
        name={line.name}
        weapon={line.weapon}
        line={line.line}
        tier={line.tier}
        priceVp={line.valueVp > 0 ? line.valueVp : null}
        index={index}
        size="sm"
        corner={
          <span className={cn("mr-3 mt-3 block display text-d3 tabular", done ? "text-gold" : "text-bone")}>
            {line.owned} <span className="text-ash">/ {line.total}</span>
          </span>
        }
        sub={
          <span className="flex flex-col gap-1 pt-1">
            {line.source === "battlepass" || line.source === "free" ? (
              <Label tone="ash" className="text-[9px]">
                {line.source === "battlepass" ? line.contract ?? "Battle pass" : "Free"}
              </Label>
            ) : null}
            <Progress fraction={line.owned / Math.max(1, line.total)} />
          </span>
        }
        onOpen={onOpen}
      />
    </li>
  );
}

export function Collection() {
  const collection = useApp((s) => s.collection);
  const settings = useApp((s) => s.settings);
  const loading = useApp((s) => s.collectionLoading);
  const loadCollection = useApp((s) => s.loadCollection);
  const openSkin = useApp((s) => s.openSkin);
  const [sort, setSort] = useState<Sort>("weapon");

  const lines = useMemo(() => {
    const src = collection?.lines ?? [];
    if (sort === "popularity") return [...src].sort((a, b) => skinHype(b.name, b.line, b.weapon).score - skinHype(a.name, a.line, a.weapon).score || a.name.localeCompare(b.name));
    if (sort === "weapon") return [...src].sort((a, b) => a.weapon.localeCompare(b.weapon) || a.name.localeCompare(b.name));
    return [...src].sort((a, b) => (b.tier?.rank ?? -1) - (a.tier?.rank ?? -1) || a.name.localeCompare(b.name));
  }, [collection, sort]);

  return (
    <Screen
      onRefresh={() => loadCollection(true)}
      refreshing={loading}
      header={
        <div className="flex items-end justify-between px-4 pb-3 safe-top md:px-10">
          <div className="flex flex-col gap-1">
            <Label className="hidden md:block">Owned</Label>
            <Display as="h1" size="d1">
              Collection
            </Display>
          </div>
          <div className="hidden items-end gap-8 md:flex">
            <Stat label="Owned skins" value={collection ? fmtNum(collection.totalOwned) : "—"} align="right" />
            <Stat label="Store value" value={collection ? `${fmtNum(collection.totalValueVp)} VP` : "—"} tone="gold" align="right" />
            <Stat label="Battle passes" value={collection ? fmtNum(collection.battlepasses.length) : "—"} align="right" />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1 md:gap-8">
        <ErrorBanner />
        <div className="flex justify-between md:hidden">
          <Stat label="Owned skins" value={collection ? fmtNum(collection.totalOwned) : "—"} />
          <Stat label="Store value" value={collection ? `${fmtNum(collection.totalValueVp)} VP` : "—"} tone="gold" align="right" />
        </div>
        {collection ? (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-hairline py-3">
            <span className="flex items-baseline gap-2">
              <Label>Store</Label>
              <span className="display text-d3 tabular">{fmtNum(collection.storeSkins)}</span>
            </span>
            <span className="flex items-baseline gap-2">
              <Label>Battle pass</Label>
              <span className="display text-d3 tabular">{fmtNum(collection.battlepassSkins)}</span>
              <span className="text-micro text-ash">
                {collection.battlepasses.length} {collection.battlepasses.length === 1 ? "pass" : "passes"} bought · ≈ {fmtNum(collection.battlepasses.length * 1000)} VP
              </span>
            </span>
            <span className="flex items-baseline gap-2">
              <Label>Free</Label>
              <span className="display text-d3 tabular">{fmtNum(collection.freeSkins)}</span>
            </span>
            {collection.battlepasses.length ? <span className="w-full text-micro text-smoke">{collection.battlepasses.join(" · ")}</span> : null}
          </div>
        ) : null}
        {collection && collection.spend.totalVp > 0 ? (
          <section className="flex flex-col gap-3">
            <HeroRule title="Spend estimate" meta={<Label>≈ {fmtAmount(collection.spend.totalVp * currency(settings.currency).perVp, settings.currency)}</Label>} />
            <div className="chamfer-sm bg-hairline p-px">
              <div className="flex flex-col gap-3 chamfer-sm bg-graphite/60 px-4 py-3">
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <Label>Roughly spent</Label>
                    <span className="flex items-center gap-1.5 display text-d1 leading-none text-gold tabular">
                      <span className="relative top-[0.08em]">{fmtNum(collection.spend.totalVp)}</span>
                      <CurrencyIcon kind="vp" size={24} />
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <Label>In {settings.currency}</Label>
                    <span className="display text-d2 leading-none text-bone tabular">{fmtAmount(collection.spend.totalVp * currency(settings.currency).perVp, settings.currency)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-3">
                  <span className="flex flex-col">
                    <Label className="text-[9px]">Bundles</Label>
                    <span className="display text-d3 tabular">{fmtNum(collection.spend.bundlesVp)}</span>
                  </span>
                  <span className="flex flex-col">
                    <Label className="text-[9px]">Single skins</Label>
                    <span className="display text-d3 tabular">{fmtNum(collection.spend.singlesVp)}</span>
                  </span>
                  <span className="flex flex-col">
                    <Label className="text-[9px]">Battle passes</Label>
                    <span className="display text-d3 tabular">{fmtNum(collection.spend.battlepassVp)}</span>
                  </span>
                </div>
                <span className="text-micro text-smoke">
                  Bundles you completed are counted at the usual ~20% bundle discount ({fmtNum(collection.spend.savedVp)} VP saved). Riot does not expose purchase history, so this is an estimate.
                </span>
              </div>
            </div>
            {collection.spend.bundles.length ? (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {collection.spend.bundles.slice(0, 12).map((b) => (
                  <li key={b.themeUuid} className="flex items-center gap-3 border-b border-hairline py-2">
                    <Img src={b.image} alt={b.name} vignette={false} className="h-10 w-16 shrink-0" imgClassName="object-cover" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-small text-bone">{b.name}</span>
                      <Label className="text-[9px]">{b.asBundle ? `Full bundle · ${b.ownedItems}/${b.totalItems} items` : `${b.ownedSkins} of ${b.totalSkins} skins`}</Label>
                    </div>
                    <span className="flex items-center gap-1 display text-d3 leading-none tabular text-gold">
                      <span className="relative top-[0.08em]">{fmtNum(b.estimatedVp)}</span>
                      <CurrencyIcon kind="vp" size={12} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
        <HeroRule
          title="Skin lines"
          meta={
            <div className="flex items-center gap-3">
              {collection?.offline ? <Label>Offline</Label> : null}
              <div className="flex gap-1">
                {(["weapon", "tier", "popularity"] as Sort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      sfx.play("click");
                      setSort(s);
                    }}
                    className={cn("label px-2 py-1 transition-colors", sort === s ? "text-gold" : "text-ash md:hover:text-bone")}
                    aria-pressed={sort === s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          }
        />
        {!collection && loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5]" />
            ))}
          </div>
        ) : lines.length === 0 ? (
          <EmptyState text="No skins owned yet." />
        ) : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {lines.map((l, i) => (
              <LineCard key={l.skinUuid} line={l} index={i} onOpen={() => openSkin(l.skinUuid)} />
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}

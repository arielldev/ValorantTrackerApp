import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { SkinLine, WeaponSkins } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Display, Glyph, Label, Progress, Sheet, Skeleton, SkinTile } from "@/components/ui";
import { skinHype } from "@/lib/rating";

export interface WeaponSheetProps {
  open: boolean;
  data: WeaponSkins | null;
  onClose: () => void;
  onOpenSkin: (skinUuid: string) => void;
  onToggleWish: (skinUuid: string, wishlisted: boolean) => void;
  stacked?: boolean;
  depth?: number;
}

function WeaponSkinTile({ line, index, onOpen, onToggle }: { line: SkinLine; index: number; onOpen: () => void; onToggle: () => void }) {
  const owned = line.owned > 0;
  return (
    <li>
      <SkinTile
        image={line.image}
        name={line.name}
        weapon={line.weapon}
        line={line.line}
        tier={line.tier}
        priceVp={line.valueVp > 0 ? line.valueVp : null}
        owned={owned}
        wishlisted={line.wishlisted}
        index={index}
        size="sm"
        corner={
          owned ? (
            <span className={cn("mr-3 mt-3 block display text-d3 tabular", line.owned === line.total ? "text-gold" : "text-ash")}>
              {line.owned}/{line.total}
            </span>
          ) : undefined
        }
        onOpen={onOpen}
        onToggleWish={onToggle}
      />
    </li>
  );
}

export function WeaponSheet({ open, data, onClose, onOpenSkin, onToggleWish, stacked, depth }: WeaponSheetProps) {
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<"popularity" | "tier" | "name" | "owned">("popularity");
  useEffect(() => {
    setQuery("");
    setTierFilter(null);
  }, [data?.weapon.uuid, open]);
  const tiers = useMemo(() => {
    const seen = new Map<string, { name: string; color: string; rank: number }>();
    for (const l of data?.lines ?? []) if (l.tier && !seen.has(l.tier.uuid)) seen.set(l.tier.uuid, { name: l.tier.name, color: l.tier.color, rank: l.tier.rank });
    return [...seen.entries()].sort((a, b) => b[1].rank - a[1].rank);
  }, [data]);
  const lines = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (data?.lines ?? []).filter((l) => (!q || l.name.toLowerCase().includes(q)) && (!tierFilter || l.tier?.uuid === tierFilter));
    const hype = (l: SkinLine) => skinHype(l.name, l.line, l.weapon).score;
    return [...filtered].sort((a, b) => {
      if (sort === "popularity") return hype(b) - hype(a) || a.name.localeCompare(b.name);
      if (sort === "tier") return (b.tier?.rank ?? -1) - (a.tier?.rank ?? -1) || hype(b) - hype(a);
      if (sort === "owned") return Number(b.owned > 0) - Number(a.owned > 0) || hype(b) - hype(a);
      return a.name.localeCompare(b.name);
    });
  }, [data, query, tierFilter, sort]);
  return (
    <Sheet open={open} onClose={onClose} stacked={stacked} depth={depth}>
      {!data ? (
        <div className="flex flex-col gap-4 px-4">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5]" />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          <div className="relative flex flex-col gap-3 px-4 pt-2 md:flex-row md:items-end md:gap-8">
            <div className="h-32 w-full vignette p-4 md:h-36 md:w-72"><Glyph src={data.weapon.image} alt={data.weapon.name} className="h-full w-full" /></div>
            <div className="flex flex-1 flex-col gap-2 pb-1">
              <Label>{data.weapon.category}</Label>
              <Display as="h2" size="d1">
                {data.weapon.name}
              </Display>
              <div className="flex items-center justify-between">
                <Label>Owned</Label>
                <span className="display text-d3 text-gold tabular">
                  {data.weapon.ownedSkins} <span className="text-ash">/ {data.weapon.totalSkins}</span>
                </span>
              </div>
              <Progress fraction={data.weapon.ownedSkins / Math.max(1, data.weapon.totalSkins)} />
            </div>
          </div>
          <div className="flex flex-col gap-3 px-4">
            <label className="flex h-11 items-center gap-2 chamfer-sm bg-hairline p-px">
              <span className="flex h-full w-full items-center gap-2 chamfer-sm bg-graphite px-3">
                <Search size={16} strokeWidth={1.5} className="shrink-0 text-ash" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${data.weapon.name} skins`}
                  className="w-full bg-transparent text-small text-bone outline-none placeholder:text-smoke"
                />
                {query ? (
                  <button aria-label="Clear" onClick={() => setQuery("")} className="text-ash">
                    <X size={14} strokeWidth={1.5} />
                  </button>
                ) : null}
              </span>
            </label>
            <div className="flex items-center gap-1 border-b border-hairline pb-2">
              <Label className="mr-1">Sort</Label>
              {(["popularity", "tier", "owned", "name"] as const).map((s) => (
                <button key={s} onClick={() => setSort(s)} className={cn("label px-2 py-1.5 transition-colors", sort === s ? "text-gold" : "text-ash md:hover:text-bone")} aria-pressed={sort === s}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setTierFilter(null)} className={cn("label px-2 py-1.5 chamfer-sm transition-colors md:hover:text-bone", tierFilter === null ? "bg-gold text-obsidian md:hover:text-obsidian" : "bg-graphite text-ash")}>
                All · {data.lines.length}
              </button>
              {tiers.map(([uuid, t]) => (
                <button key={uuid} onClick={() => setTierFilter(tierFilter === uuid ? null : uuid)} className={cn("label px-2 py-1.5 chamfer-sm transition-all md:hover:brightness-125", tierFilter === uuid ? "text-obsidian" : "bg-graphite")} style={tierFilter === uuid ? { background: t.color } : { color: t.color }}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3">
            {lines.length === 0 ? <li className="col-span-full py-6 text-center text-small text-ash">No skins match.</li> : null}
            {lines.map((l, i) => (
              <WeaponSkinTile key={l.skinUuid} line={l} index={i} onOpen={() => onOpenSkin(l.skinUuid)} onToggle={() => onToggleWish(l.skinUuid, l.wishlisted)} />
            ))}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

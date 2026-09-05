import { useEffect, useRef, useState } from "react";
import { Check, Star, Volume2, VolumeX } from "lucide-react";
import type { CollectionItem, SkinDetail } from "@/lib/types";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/sfx";
import { Affordability, Button, Display, HypeMeter, Img, Label, Price, Sheet, Skeleton, TierBadge, TierStripe } from "@/components/ui";
import { skinHype } from "@/lib/rating";

export interface SkinSheetProps {
  open: boolean;
  loading: boolean;
  detail: SkinDetail | null;
  currency: string;
  onClose: () => void;
  onToggleWish: (skinUuid: string, wishlisted: boolean) => void;
  stacked?: boolean;
  depth?: number;
}

function VideoPreview({ src, poster, alt }: { src: string | null; poster: string | null; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    setFailed(false);
    setReady(false);
    setMuted(true);
  }, [src]);
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  if (!src || failed) return <Img src={poster} alt={alt} vignette className="aspect-video w-full p-6 md:p-10" imgClassName="drop-shadow-[0_18px_28px_rgba(0,0,0,0.7)]" />;
  return (
    <div className="relative aspect-video w-full bg-obsidian">
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted
        autoPlay
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        onCanPlay={() => setReady(true)}
        onLoadedData={() => setReady(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-300 md:object-contain md:p-6", ready ? "opacity-100" : "opacity-0")}
      />
      {!ready ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-charcoal">
          <div className="h-2/3 w-3/4 bg-graphite" />
          <div className="h-0.5 w-32 overflow-hidden bg-graphite">
            <div className="h-full w-1/2 gold-gradient-h animate-sweep [animation-iteration-count:infinite]" />
          </div>
        </div>
      ) : null}
      <button
        aria-label={muted ? "Unmute video" : "Mute video"}
        onClick={() => {
          sfx.play("click");
          setMuted((m) => !m);
        }}
        className={cn("absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center chamfer-sm bg-obsidian/80 text-bone transition-colors md:hover:bg-graphite md:hover:text-gold", !muted && "text-gold")}
      >
        {muted ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

function ChromaSwatches({ chromas, selected, skinOwned, onSelect }: { chromas: CollectionItem[]; selected: string | null; skinOwned: boolean; onSelect: (c: CollectionItem | null) => void }) {
  if (chromas.length <= 1) return null;
  const current = selected ? chromas.find((c) => c.uuid === selected) : chromas[0];
  const ownedCount = chromas.filter((c) => c.owned).length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label>Variants</Label>
        {skinOwned ? (
          <Label tone={ownedCount === chromas.length ? "gold" : "ash"}>
            {ownedCount} / {chromas.length} owned
          </Label>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {chromas.map((c, i) => {
          const active = i === 0 ? selected === null : selected === c.uuid;
          const has = skinOwned && (c.owned || i === 0);
          return (
            <button
              key={c.uuid}
              aria-label={c.name}
              aria-pressed={active}
              onClick={() => {
                sfx.play("click");
                onSelect(i === 0 || active ? null : c);
              }}
              className={cn("relative h-11 w-11 chamfer-sm p-px transition-transform md:hover:scale-110 md:hover:bg-gold/70", active ? "gold-gradient scale-110" : has ? "bg-gold/60" : "bg-hairline")}
            >
              <span className="block h-full w-full chamfer-sm bg-graphite">
                {c.swatch ? (
                  <img src={c.swatch} alt="" className={cn("h-full w-full object-cover", skinOwned && !has && "opacity-40 grayscale")} draggable={false} />
                ) : (
                  <span className="flex h-full items-center justify-center label text-[9px] text-ash">Base</span>
                )}
              </span>
              {has ? (
                <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center chamfer-sm bg-gold shadow-[0_0_0_1px_#0A0A0C]">
                  <Check size={11} strokeWidth={3} className="text-obsidian" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {current ? (
        <div className="flex items-center justify-between">
          <span className="truncate text-small text-bone">{current.name.split("\n").join(" ")}</span>
          {skinOwned ? (
            <Label tone={current.owned || current === chromas[0] ? "gold" : "smoke"}>{current.owned || current === chromas[0] ? "Owned" : "Not owned"}</Label>
          ) : (
            <Label tone="smoke">{current === chromas[0] ? "Base" : "Variant"}</Label>
          )}
        </div>
      ) : null}
    </div>
  );
}

function LevelList({ levels, selected, skinOwned, onSelect }: { levels: CollectionItem[]; selected: string | null; skinOwned: boolean; onSelect: (l: CollectionItem | null) => void }) {
  return (
    <ul className="flex flex-col">
      {levels.map((l, i) => {
        const active = selected === l.uuid;
        return (
          <li
            key={l.uuid}
            role="button"
            tabIndex={0}
            onClick={() => {
              sfx.play("click");
              onSelect(active ? null : l);
            }}
            className={cn("flex cursor-pointer items-center justify-between border-b border-hairline py-3 transition-colors md:hover:-mx-4 md:hover:bg-graphite/40 md:hover:px-4", skinOwned && !l.owned && "opacity-60", active && "-mx-4 bg-graphite/60 px-4")}
          >
            <span className="flex items-center gap-3">
              <span className={cn("display text-d3 tabular", active ? "text-gold-bright" : "text-gold")}>{i + 1}</span>
              <span className="text-small text-bone">{l.name.split("\n")[0]}</span>
              {l.video ? (
                <Label tone={active ? "gold" : "smoke"} className="text-[9px]">
                  {active ? "Playing" : "Preview"}
                </Label>
              ) : null}
            </span>
            {skinOwned ? (
              <Label tone={l.owned ? "gold" : "smoke"}>{l.owned ? "Owned" : "Missing"}</Label>
            ) : (
              <Label tone="smoke">{i === 0 ? "Base" : "Upgrade"}</Label>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SkinSheet({ open, loading, detail, currency, onClose, onToggleWish, stacked, depth }: SkinSheetProps) {
  const [chroma, setChroma] = useState<CollectionItem | null>(null);
  const [level, setLevel] = useState<CollectionItem | null>(null);
  useEffect(() => {
    setChroma(null);
    setLevel(null);
  }, [detail?.skinUuid]);

  const hype = detail ? skinHype(detail.name, detail.line, detail.weapon) : null;
  const previewVideo = level?.video ?? chroma?.video ?? (level || chroma ? null : (detail?.video ?? null));
  const poster = level?.image ?? chroma?.image ?? detail?.image ?? null;
  const owned = detail?.owned ?? false;

  return (
    <Sheet open={open} onClose={onClose} stacked={stacked} depth={depth}>
      {loading || !detail ? (
        <div className="flex flex-col gap-4 px-4">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/3" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-6">
          <div className="relative">
            <TierStripe tier={detail.tier} />
            <VideoPreview src={previewVideo} poster={poster} alt={detail.name} />
          </div>
          <div className="flex flex-col gap-4 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <TierBadge tier={detail.tier} />
                <Display as="h2" size="d1" className="truncate">
                  {detail.line}
                </Display>
                <Label>{detail.weapon}</Label>
              </div>
              {detail.priceVp != null ? <Price vp={detail.priceVp} currency={currency} size="d2" align="right" plan={false} /> : null}
            </div>
            {hype ? (
              <div className="flex items-center justify-between border-y border-hairline py-3">
                <div className="flex flex-col gap-0.5">
                  <Label>Community hype</Label>
                  <span className="text-small text-ash">{hype.note ?? (hype.matched ? "Well known line" : "Not on the community tier lists")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <HypeMeter tier={hype.tier} size="md" score={hype.score} />
                </div>
              </div>
            ) : null}
            {detail.priceVp != null && !owned ? <Affordability priceVp={detail.priceVp} currency={currency} /> : null}
            <ChromaSwatches
              chromas={detail.chromas}
              skinOwned={owned}
              selected={chroma?.uuid ?? null}
              onSelect={(c) => {
                setChroma(c);
                setLevel(null);
              }}
            />
            <LevelList
              levels={detail.levels}
              skinOwned={owned}
              selected={level?.uuid ?? null}
              onSelect={(l) => {
                setLevel(l);
                setChroma(null);
              }}
            />
            <Button
              variant={detail.wishlisted ? "ghost" : "primary"}
              full
              size="lg"
              disabled={owned}
              sound={detail.wishlisted ? "click" : "confirm"}
              icon={owned ? <Check strokeWidth={2.5} /> : <Star strokeWidth={2.2} fill={detail.wishlisted ? "currentColor" : "none"} />}
              onClick={() => onToggleWish(detail.skinUuid, detail.wishlisted)}
            >
              {owned ? "Owned" : detail.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

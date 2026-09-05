import type { Store } from "@/lib/types";
import { rateShop } from "@/lib/rating";
import { GradeEmblem, HypeMeter, Label } from "@/components/ui";
import { GRADE_PALETTE } from "@/components/ui/HypeMeter";
import type { HypeTier } from "@/lib/hype";

function paletteKey(grade: string): HypeTier {
  return (["SSS", "SS", "S", "A", "B", "C", "D"].includes(grade) ? grade : "D") as HypeTier;
}

function paletteFor(grade: string) {
  return GRADE_PALETTE[paletteKey(grade)];
}

export function ShopRating({ store }: { store: Store | null }) {
  const rating = rateShop(store);
  if (!rating) return null;
  const { score, level, next, progress, best, hits } = rating;
  return (
    <section className="chamfer gold-gradient p-px">
      <div className="relative flex chamfer flex-col items-center gap-4 overflow-hidden bg-charcoal p-4 text-center sm:flex-row sm:text-left md:gap-6 md:p-5">
        <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: `radial-gradient(70% 90% at 0% 50%, ${paletteFor(level.name).mid}33, transparent)` }} />
        <div className="relative flex shrink-0 items-center justify-center">
          <div className="pointer-events-none absolute h-20 w-20 rounded-full blur-2xl sm:h-24 sm:w-24" style={{ background: paletteFor(level.name).mid, opacity: 0.35 }} />
          <GradeEmblem tier={paletteKey(level.name)} label={level.name} size={80} className="sm:hidden" title={`Shop grade ${level.name}`} />
          <GradeEmblem tier={paletteKey(level.name)} label={level.name} size={96} className="hidden sm:block" title={`Shop grade ${level.name}`} />
        </div>
        <div className="relative flex w-full min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Label tone="gold">Shop rating</Label>
            <span className="display text-d2 leading-none tabular text-ash">
              <span className="text-bone">{score}</span> / 100
            </span>
          </div>
          <span className="text-body text-bone">{level.verdict}</span>
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 bg-graphite">
              <div className="h-full" style={{ width: `${Math.round(progress * 100)}%`, background: `linear-gradient(90deg, ${paletteFor(level.name).to}, ${paletteFor(level.name).from})` }} />
            </div>
            <Label className="shrink-0 text-[9px]">{next ? `${next.min - score} to ${next.name}` : "Max"}</Label>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-start">
            {best ? (
              <span className="flex min-w-0 items-center gap-2 text-micro text-ash">
                <HypeMeter tier={best.hype.tier} score={best.hype.score} />
                <span className="truncate">Best: {best.offer.name}</span>
              </span>
            ) : null}
            {hits ? <span className="text-micro tabular text-gold-bright">★ {hits} wishlisted</span> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { ErrorBanner } from "@/components/ErrorBanner";
import type { HistoryDay, HistoryEntry } from "@/lib/types";
import { fmtDateLong, fmtNum, isoToday, monthLabel } from "@/lib/format";
import { cn } from "@/lib/cn";
import { canHover, sfx } from "@/lib/sfx";
import { Display, EmptyState, HeroRule, IconButton, Label, Screen, SkinTile, Stat } from "@/components/ui";

function ym(iso: string): [number, number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1];
}

function iso(y: number, m0: number, d: number): string {
  const mm = m0 + 1;
  return `${y}-${mm < 10 ? "0" : ""}${mm}-${d < 10 ? "0" : ""}${d}`;
}

function Calendar({
  year,
  month,
  days,
  selected,
  installDate,
  onSelect,
  onMonth,
}: {
  year: number;
  month: number;
  days: Map<string, HistoryDay>;
  selected: string | null;
  installDate: string;
  onSelect: (date: string) => void;
  onMonth: (delta: number) => void;
}) {
  const count = new Date(year, month + 1, 0).getDate();
  const first = new Date(year, month, 1).getDay();
  const today = isoToday();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <IconButton label="Previous month" onClick={() => onMonth(-1)}>
          <ChevronLeft size={18} strokeWidth={1.5} />
        </IconButton>
        <Display size="d3">{monthLabel(year, month)}</Display>
        <IconButton label="Next month" onClick={() => onMonth(1)}>
          <ChevronRight size={18} strokeWidth={1.5} />
        </IconButton>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="label py-1 text-center text-smoke">
            {d}
          </span>
        ))}
        {Array.from({ length: first }).map((_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: count }).map((_, i) => {
          const date = iso(year, month, i + 1);
          const has = days.has(date);
          const on = selected === date;
          const future = date > today;
          const before = date < installDate;
          return (
            <button
              key={date}
              disabled={!has}
              onClick={() => {
                sfx.play("click");
                onSelect(date);
              }}
              onPointerEnter={() => has && canHover && sfx.play("hover")}
              className={cn(
                "relative flex h-10 items-center justify-center text-small tabular transition-colors",
                on ? "gold-gradient text-obsidian chamfer-sm" : has ? "text-bone md:hover:bg-graphite" : "text-smoke",
                (future || before) && !has && "opacity-40",
                date === today && !on && "text-gold",
              )}
            >
              {i + 1}
              {has && !on ? <span className="absolute bottom-1 h-0.5 w-3 bg-gold" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayCard({ entry, index, onOpen }: { entry: HistoryEntry; index: number; onOpen: () => void }) {
  return (
    <li>
      <SkinTile
        image={entry.image}
        name={entry.name}
        weapon={entry.weapon}
        line={entry.line}
        tier={entry.tier}
        priceVp={entry.priceVp}
        owned={entry.ownedAtFetch}
        wishlisted={entry.purchased}
        index={index}
        corner={
          entry.purchased ? (
            <Label tone="gold" className="mr-3 mt-3 block">
              Bought
            </Label>
          ) : entry.ownedAtFetch ? (
            <Label className="mr-3 mt-3 block">Owned</Label>
          ) : (
            <span />
          )
        }
        onOpen={onOpen}
      />
    </li>
  );
}

export function History() {
  const history = useApp((s) => s.history);
  const loadHistory = useApp((s) => s.loadHistory);
  const openSkin = useApp((s) => s.openSkin);
  const [selected, setSelected] = useState<string | null>(null);
  const [[year, month], setMonth] = useState<[number, number]>(() => ym(isoToday()));

  const days = useMemo(() => new Map((history?.days ?? []).map((d) => [d.date, d])), [history]);

  useEffect(() => {
    if (!selected && history?.days.length) setSelected(history.days[0].date);
  }, [history, selected]);

  const day = selected ? days.get(selected) : undefined;
  const spentOnDay = day?.skins.filter((s) => s.purchased).reduce((a, s) => a + s.priceVp, 0) ?? 0;

  return (
    <Screen
      onRefresh={loadHistory}
      header={
        <div className="flex items-end justify-between px-4 pb-3 safe-top md:px-10">
          <div className="flex flex-col gap-1">
            <Label className="hidden md:block">Past shops</Label>
            <Display as="h1" size="d1">
              History
            </Display>
          </div>
          <div className="hidden items-end gap-8 md:flex">
            <Stat label="VP spent this month" value={history ? `${fmtNum(history.vpSpentMonth)} VP` : "—"} tone="gold" align="right" />
            <Stat label="All time" value={history ? `${fmtNum(history.vpSpentAll)} VP` : "—"} align="right" />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 pt-1 md:gap-8">
        <ErrorBanner />
        <div className="flex justify-between md:hidden">
          <Stat label="VP spent this month" value={history ? `${fmtNum(history.vpSpentMonth)} VP` : "—"} tone="gold" />
          <Stat label="All time" value={history ? `${fmtNum(history.vpSpentAll)} VP` : "—"} align="right" />
        </div>
        <div className="grid gap-8 md:grid-cols-[20rem_minmax(0,1fr)] md:items-start">
          <aside className="flex flex-col gap-4 md:sticky md:top-0">
            <Calendar
              year={year}
              month={month}
              days={days}
              selected={selected}
              installDate={history?.installDate ?? isoToday()}
              onSelect={setSelected}
              onMonth={(delta) => {
                sfx.play("tab");
                setMonth(([y, m]) => {
                  const d = new Date(y, m + delta, 1);
                  return [d.getFullYear(), d.getMonth()];
                });
              }}
            />
            {history ? (
              <Label className="normal-case tracking-normal text-[12px]">
                Recording since {fmtDateLong(history.installDate)}. Earlier shops are not available.
              </Label>
            ) : null}
          </aside>
          <section className="flex flex-col gap-4">
            <HeroRule title={day ? fmtDateLong(day.date) : "Pick a day"} meta={day && spentOnDay > 0 ? <Label tone="gold">Spent {fmtNum(spentOnDay)} VP</Label> : undefined} />
            {!history || history.days.length === 0 ? (
              <EmptyState text="Your first shop will be recorded on the next fetch." />
            ) : day ? (
              <ul className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {day.skins.map((s, i) => (
                  <DayCard key={s.levelUuid} entry={s} index={i} onOpen={() => openSkin(s.skinUuid)} />
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      </div>
    </Screen>
  );
}

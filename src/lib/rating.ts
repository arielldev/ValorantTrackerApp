import type { SkinOffer, Store } from "./types";
import { lookupHype, TIER_SCORE, WEAPON_WEIGHT, type HypeTier } from "./hype";

export interface SkinHype {
  tier: HypeTier;
  score: number;
  note?: string;
  matched: boolean;
  weaponWeight: number;
}

export function skinHype(name: string, line: string, weapon: string): SkinHype {
  const h = lookupHype(name, line, weapon);
  const weaponWeight = WEAPON_WEIGHT[weapon] ?? 0.65;
  const base = TIER_SCORE[h.tier];
  const score = Math.round(base * (0.55 + 0.45 * weaponWeight));
  return { tier: h.tier, score, note: h.note, matched: h.matched, weaponWeight };
}

export interface ShopLevel {
  index: number;
  name: string;
  min: number;
  verdict: string;
  color: string;
}

export const SHOP_LEVELS: ShopLevel[] = [
  { index: 0, name: "F", min: 0, verdict: "Dead shop. Nothing anyone wants.", color: "#5A574F" },
  { index: 1, name: "E", min: 20, verdict: "Filler. Skip it, save the VP.", color: "#6E6A5F" },
  { index: 2, name: "D", min: 32, verdict: "Weak. One passable skin at best.", color: "#8E897E" },
  { index: 3, name: "C", min: 44, verdict: "Mid. Nothing you'd regret missing.", color: "#A89A66" },
  { index: 4, name: "B", min: 56, verdict: "Decent. One good line, the rest is noise.", color: "#C9A227" },
  { index: 5, name: "A", min: 68, verdict: "Solid. A popular line on a weapon that matters.", color: "#D8B23A" },
  { index: 6, name: "S", min: 80, verdict: "Strong. A skin people hunt for is sitting there.", color: "#EAD27A" },
  { index: 7, name: "SS", min: 90, verdict: "Elite. More than one legendary line at once.", color: "#F3E3A0" },
  { index: 8, name: "SSS", min: 97, verdict: "Jackpot. Screenshot it.", color: "#FFF4C8" },
];

export interface ShopRating {
  score: number;
  level: ShopLevel;
  next: ShopLevel | null;
  progress: number;
  best: { offer: SkinOffer; hype: SkinHype } | null;
  hits: number;
}

export function rateShop(store: Store | null): ShopRating | null {
  if (!store || store.daily.length === 0) return null;
  const rated = store.daily.map((offer) => ({ offer, hype: skinHype(offer.name, offer.line, offer.weapon) }));
  rated.sort((a, b) => b.hype.score - a.hype.score);
  const top = rated[0].hype.score;
  const second = rated[1]?.hype.score ?? top;
  const rest = rated.slice(2).reduce((a, r) => a + r.hype.score, 0) / Math.max(1, rated.length - 2);
  let score = top * 0.55 + second * 0.3 + rest * 0.15;
  const hits = rated.filter((r) => r.offer.wishlisted && !r.offer.owned).length;
  score += Math.min(12, hits * 8);
  const legends = rated.filter((r) => r.hype.tier === "SSS" || r.hype.tier === "SS").length;
  if (legends >= 2) score += 6;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let level = SHOP_LEVELS[0];
  for (const l of SHOP_LEVELS) if (score >= l.min) level = l;
  const next = SHOP_LEVELS[level.index + 1] ?? null;
  const progress = next ? (score - level.min) / (next.min - level.min) : 1;
  return { score, level, next, progress, best: rated[0] ?? null, hits };
}

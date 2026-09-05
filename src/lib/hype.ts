import { LINE_TIERS } from "./hypeData";

export type HypeTier = "SSS" | "SS" | "S" | "A" | "B" | "C" | "D";

export interface HypeEntry {
  tier: HypeTier;
  note?: string;
}

export const WEAPON_WEIGHT: Record<string, number> = {
  Vandal: 1.0,
  Phantom: 1.0,
  Operator: 0.95,
  Sheriff: 0.92,
  Melee: 0.98,
  Spectre: 0.85,
  Guardian: 0.8,
  Bulldog: 0.72,
  Ghost: 0.8,
  Classic: 0.75,
  Judge: 0.72,
  Odin: 0.7,
  Marshal: 0.7,
  Outlaw: 0.72,
  Ares: 0.6,
  Stinger: 0.62,
  Bucky: 0.6,
  Frenzy: 0.62,
  Shorty: 0.55,
};

export const TIER_SCORE: Record<HypeTier, number> = { SSS: 100, SS: 92, S: 84, A: 72, B: 58, C: 44, D: 28 };

let overrides: Record<string, HypeEntry> = {};

export function setHypeOverrides(map: Record<string, HypeEntry>) {
  overrides = map;
}

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const INDEX: Map<string, HypeEntry> = new Map(Object.entries(LINE_TIERS).map(([k, [tier, note]]) => [normalize(k), { tier, note: note || undefined }]));
const KEYS: string[] = [...INDEX.keys()].sort((a, b) => b.length - a.length);

function find(pool: Map<string, HypeEntry>, keys: string[], candidates: string[]): HypeEntry | null {
  for (const c of candidates) {
    const hit = pool.get(c);
    if (hit) return hit;
  }
  for (const c of candidates) {
    for (const k of keys) {
      if (c === k || c.startsWith(k + " ") || c.endsWith(" " + k)) return pool.get(k)!;
    }
  }
  return null;
}

export function lookupHype(name: string, line: string, weapon: string): HypeEntry & { matched: boolean } {
  const candidates = [normalize(name), normalize(line)].filter((c, i, a) => c && a.indexOf(c) === i);
  const w = normalize(weapon);
  if (candidates.length === 0 || candidates.every((c) => c === w || c === "standard" || c.startsWith("standard "))) {
    return { tier: "D", note: "Default look", matched: true };
  }
  const o = Object.entries(overrides);
  if (o.length) {
    const pool = new Map(o.map(([k, v]) => [normalize(k), v]));
    const hit = find(pool, [...pool.keys()].sort((a, b) => b.length - a.length), candidates);
    if (hit) return { ...hit, matched: true };
  }
  const hit = find(INDEX, KEYS, candidates);
  if (hit) return { ...hit, matched: true };
  return { tier: "C", note: "New line, not graded yet", matched: false };
}

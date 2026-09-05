import { describe, expect, it } from "vitest";
import themes from "./hypeThemes.json";
import { lookupHype } from "./hype";
import { rateShop, skinHype } from "./rating";
import { fmtPacks, packPlan } from "./currency";
import type { SkinOffer, Store } from "./types";

describe("hype coverage", () => {
  it("grades every collection in the catalog", () => {
    const missing = (themes as string[]).filter((name) => !lookupHype(`${name} Vandal`, name, "Vandal").matched);
    expect(missing).toEqual([]);
  });

  it("grades known lines as the community does", () => {
    expect(lookupHype("Reaver Vandal", "Reaver", "Vandal").tier).toBe("SSS");
    expect(lookupHype("Gaia's Vengeance Vandal", "Gaia's Vengeance", "Vandal").tier).toBe("SSS");
    expect(lookupHype("Aeris Vandal", "Aeris", "Vandal").tier).toBe("S");
    expect(lookupHype("Suit of Aeris", "Suit of Aeris", "Melee").tier).toBe("S");
    expect(lookupHype("VCT x SEN Vandal", "VCT x SEN", "Vandal").tier).toBe("B");
    expect(lookupHype("Jett Sheriff", "Jett", "Sheriff").tier).toBe("D");
    expect(lookupHype("Standard Vandal", "Standard", "Vandal").tier).toBe("D");
  });

  it("weights weapons without touching rarity", () => {
    const vandal = skinHype("Reaver Vandal", "Reaver", "Vandal");
    const shorty = skinHype("Reaver Shorty", "Reaver", "Shorty");
    expect(vandal.score).toBe(100);
    expect(shorty.score).toBeLessThan(vandal.score);
    expect(shorty.tier).toBe("SSS");
  });
});

function offer(name: string, line: string, weapon: string, extra: Partial<SkinOffer> = {}): SkinOffer {
  return {
    levelUuid: name,
    skinUuid: name,
    name,
    weapon,
    line,
    image: null,
    video: null,
    tier: null,
    priceVp: 1775,
    originalPriceVp: null,
    discountPercent: null,
    owned: false,
    wishlisted: false,
    ...extra,
  };
}

function store(daily: SkinOffer[]): Store {
  return { fetchedAt: 0, daily, dailyExpiresAt: 0, bundles: [], nightMarket: null, accessories: [], accessoriesExpireAt: 0, offline: false };
}

describe("shop rating", () => {
  it("returns null without a store", () => {
    expect(rateShop(null)).toBeNull();
  });

  it("grades a legendary shop SS or better", () => {
    const r = rateShop(store([offer("Reaver Vandal", "Reaver", "Vandal"), offer("Prime Phantom", "Prime", "Phantom"), offer("Aeris Sheriff", "Aeris", "Sheriff"), offer("Ion Spectre", "Ion", "Spectre")]))!;
    expect(["SS", "SSS"]).toContain(r.level.name);
    expect(r.best?.offer.name).toBe("Reaver Vandal");
  });

  it("grades a filler shop low", () => {
    const r = rateShop(store([offer(".EXE Bucky", ".EXE", "Bucky"), offer("Jett Shorty", "Jett", "Shorty"), offer("Rush Frenzy", "Rush", "Frenzy"), offer("Nitro Stinger", "Nitro", "Stinger")]))!;
    expect(["F", "E", "D"]).toContain(r.level.name);
  });

  it("rewards wishlist hits", () => {
    const base = rateShop(store([offer("Oni Phantom", "Oni", "Phantom")]))!;
    const hit = rateShop(store([offer("Oni Phantom", "Oni", "Phantom", { wishlisted: true })]))!;
    expect(hit.score).toBeGreaterThan(base.score);
  });
});

describe("pack calculator", () => {
  it("covers the gap with the fewest sensible packs", () => {
    const p = packPlan(3700, 0, "EUR");
    expect(p.packs.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(3700);
    expect(p.coveredByWallet).toBe(false);
    expect(fmtPacks(p.packs)).toMatch(/3,650/);
  });

  it("uses the wallet first", () => {
    expect(packPlan(1775, 2000, "EUR").coveredByWallet).toBe(true);
    expect(packPlan(1775, 1000, "EUR").needVp).toBe(775);
  });

  it("groups repeated packs", () => {
    expect(fmtPacks([475, 475, 3650])).toBe("3,650 + 2×475");
  });
});

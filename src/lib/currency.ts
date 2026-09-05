export interface Currency {
  code: string;
  symbol: string;
  perVp: number;
  name: string;
  packs?: number[];
}

export const PACK_SIZES = [475, 1000, 2050, 3650, 5350, 11000];

const EUR_PACKS = [4.99, 9.99, 19.99, 34.99, 49.99, 99.99];

export const CURRENCIES: Currency[] = [
  { code: "EUR", symbol: "€", perVp: 0.01, name: "Euro", packs: EUR_PACKS },
  { code: "USD", symbol: "$", perVp: 0.01, name: "US Dollar", packs: [4.99, 9.99, 19.99, 34.99, 49.99, 99.99] },
  { code: "GBP", symbol: "£", perVp: 0.0085, name: "British Pound", packs: [4.49, 8.99, 17.99, 31.49, 44.99, 89.99] },
  { code: "ILS", symbol: "₪", perVp: 0.037, name: "Israeli Shekel", packs: [18.9, 37.9, 74.9, 129.9, 189.9, 379.9] },
  { code: "TRY", symbol: "₺", perVp: 0.33, name: "Turkish Lira" },
  { code: "BRL", symbol: "R$", perVp: 0.045, name: "Brazilian Real", packs: [21.9, 44.9, 89.9, 159.9, 229.9, 459.9] },
  { code: "CAD", symbol: "CA$", perVp: 0.0135, name: "Canadian Dollar", packs: [6.49, 12.99, 25.99, 45.99, 64.99, 129.99] },
  { code: "AUD", symbol: "A$", perVp: 0.0155, name: "Australian Dollar", packs: [7.49, 14.99, 29.99, 52.99, 74.99, 149.99] },
  { code: "MXN", symbol: "MX$", perVp: 0.19, name: "Mexican Peso" },
  { code: "PLN", symbol: "zł", perVp: 0.045, name: "Polish Złoty", packs: [21.99, 43.99, 87.99, 154.99, 219.99, 439.99] },
  { code: "JPY", symbol: "¥", perVp: 1.4, name: "Japanese Yen" },
  { code: "KRW", symbol: "₩", perVp: 11.8, name: "South Korean Won" },
  { code: "INR", symbol: "₹", perVp: 0.79, name: "Indian Rupee" },
  { code: "SAR", symbol: "SR", perVp: 0.0375, name: "Saudi Riyal" },
  { code: "AED", symbol: "AED", perVp: 0.037, name: "UAE Dirham" },
];

export function currency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

function packPrices(c: Currency): number[] {
  if (c.packs) return c.packs;
  const scale = c.perVp / 0.01;
  return EUR_PACKS.map((p) => Math.round(p * scale * 100) / 100);
}

export function fmtAmount(value: number, code: string): string {
  const c = currency(code);
  const digits = c.perVp >= 1 ? 0 : 2;
  const num = new Intl.NumberFormat("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
  return `${c.symbol}${num}`;
}

export function fmtMoney(vp: number, code: string): string {
  return `≈ ${fmtAmount(vp * currency(code).perVp, code)}`;
}

export interface PackPlan {
  cost: number;
  packs: number[];
  needVp: number;
  coveredByWallet: boolean;
}

export function packPlan(priceVp: number, walletVp: number, code: string): PackPlan {
  const need = Math.max(0, priceVp - walletVp);
  if (need === 0) return { cost: 0, packs: [], needVp: 0, coveredByWallet: true };
  const c = currency(code);
  const prices = packPrices(c);
  const max = need + PACK_SIZES[0];
  const best = new Array<number>(max + 1).fill(Infinity);
  const choice = new Array<number>(max + 1).fill(-1);
  best[0] = 0;
  const penalty = prices[0] * 0.01;
  for (let v = 1; v <= max; v++) {
    for (let i = 0; i < PACK_SIZES.length; i++) {
      const prev = Math.max(0, v - PACK_SIZES[i]);
      const cost = best[prev] + prices[i] + penalty;
      if (cost < best[v] - 1e-9) {
        best[v] = cost;
        choice[v] = i;
      }
    }
  }
  let bestV = need;
  for (let v = need; v <= max; v++) if (best[v] < best[bestV] - 1e-9) bestV = v;
  const packs: number[] = [];
  let v = bestV;
  while (v > 0 && choice[v] >= 0) {
    const i = choice[v];
    packs.push(PACK_SIZES[i]);
    v = Math.max(0, v - PACK_SIZES[i]);
  }
  packs.sort((a, b) => b - a);
  const cost = packs.reduce((a, p) => a + prices[PACK_SIZES.indexOf(p)], 0);
  return { cost: Math.round(cost * 100) / 100, packs, needVp: need, coveredByWallet: false };
}

export function fmtPacks(packs: number[]): string {
  const counts = new Map<number, number>();
  for (const p of packs) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([p, n]) => (n > 1 ? `${n}×${new Intl.NumberFormat("en-US").format(p)}` : new Intl.NumberFormat("en-US").format(p)))
    .join(" + ");
}

export interface Player {
  gameName: string;
  tagLine: string;
  region: string;
}

export interface Tier {
  uuid: string;
  name: string;
  rank: number;
  color: string;
  icon: string | null;
}

export type ItemKind = "skin" | "chroma" | "buddy" | "spray" | "card" | "title" | "other";

export interface SkinOffer {
  levelUuid: string;
  skinUuid: string;
  name: string;
  weapon: string;
  line: string;
  image: string | null;
  video: string | null;
  tier: Tier | null;
  priceVp: number;
  originalPriceVp: number | null;
  discountPercent: number | null;
  owned: boolean;
  wishlisted: boolean;
}

export interface BundleItem {
  uuid: string;
  kind: ItemKind;
  name: string;
  image: string | null;
  basePriceVp: number;
  priceVp: number;
  owned: boolean;
  wishlisted: boolean;
  skinUuid: string | null;
}

export interface Bundle {
  uuid: string;
  name: string;
  image: string | null;
  priceVp: number;
  fullPriceVp: number;
  itemsTotalVp: number;
  ownedCount: number;
  items: BundleItem[];
  expiresAt: number;
}

export interface Accessory {
  uuid: string;
  kind: ItemKind;
  name: string;
  image: string | null;
  priceKc: number;
  owned: boolean;
}

export interface NightMarket {
  offers: SkinOffer[];
  expiresAt: number;
}

export interface Store {
  fetchedAt: number;
  daily: SkinOffer[];
  dailyExpiresAt: number;
  bundles: Bundle[];
  nightMarket: NightMarket | null;
  accessories: Accessory[];
  accessoriesExpireAt: number;
  offline: boolean;
}

export interface Wallet {
  vp: number;
  rp: number;
  kc: number;
  fetchedAt: number;
  offline: boolean;
}

export interface CollectionItem {
  uuid: string;
  kind: ItemKind;
  name: string;
  image: string | null;
  swatch: string | null;
  video: string | null;
  owned: boolean;
}

export interface SkinLine {
  skinUuid: string;
  name: string;
  weapon: string;
  line: string;
  tier: Tier | null;
  image: string | null;
  owned: number;
  total: number;
  valueVp: number;
  wishlisted: boolean;
  source: "store" | "battlepass" | "free" | "";
  contract: string | null;
  items: CollectionItem[];
}

export interface SpendBundle {
  themeUuid: string;
  name: string;
  image: string | null;
  ownedItems: number;
  totalItems: number;
  ownedSkins: number;
  totalSkins: number;
  asBundle: boolean;
  estimatedVp: number;
  listVp: number;
}

export interface SpendEstimate {
  totalVp: number;
  bundlesVp: number;
  singlesVp: number;
  battlepassVp: number;
  savedVp: number;
  bundles: SpendBundle[];
  singles: number;
}

export interface Collection {
  totalOwned: number;
  totalValueVp: number;
  spend: SpendEstimate;
  storeSkins: number;
  battlepassSkins: number;
  freeSkins: number;
  battlepasses: string[];
  lines: SkinLine[];
  fetchedAt: number;
  offline: boolean;
}

export interface HistoryEntry {
  levelUuid: string;
  skinUuid: string;
  name: string;
  weapon: string;
  line: string;
  image: string | null;
  tier: Tier | null;
  priceVp: number;
  ownedAtFetch: boolean;
  purchased: boolean;
}

export interface HistoryDay {
  date: string;
  fetchedAt: number;
  skins: HistoryEntry[];
}

export interface History {
  installDate: string;
  days: HistoryDay[];
  vpSpentMonth: number;
  vpSpentAll: number;
}

export type WishState =
  | { kind: "in_shop" }
  | { kind: "night_market"; priceVp: number; discountPercent: number }
  | { kind: "in_bundle"; bundle: string }
  | { kind: "last_seen"; days: number }
  | { kind: "never_seen" };

export interface WishlistItem {
  skinUuid: string;
  levelUuid: string;
  name: string;
  weapon: string;
  line: string;
  image: string | null;
  tier: Tier | null;
  priceVp: number | null;
  state: WishState;
  owned: boolean;
  addedAt: number;
}

export interface Wishlist {
  items: WishlistItem[];
  totalVp: number;
}

export interface Settings {
  currency: string;
  notifyDaily: boolean;
  notifyHour: number;
  notifyMinute: number;
  notifyWishlist: boolean;
  notifyBundles: boolean;
  storefrontV3: boolean;
  sounds: boolean;
  haptics: boolean;
  autostart: boolean;
  closeToTray: boolean;
}

export interface SessionInfo {
  player: Player | null;
  signedIn: boolean;
  offline: boolean;
  installDate: string;
  appVersion: string;
  disabledMessage: string | null;
}

export interface SkinDetail {
  skinUuid: string;
  name: string;
  weapon: string;
  line: string;
  tier: Tier | null;
  image: string | null;
  video: string | null;
  priceVp: number | null;
  owned: boolean;
  wishlisted: boolean;
  levels: CollectionItem[];
  chromas: CollectionItem[];
}

export type AppErrorKind =
  | "not_signed_in"
  | "login_cancelled"
  | "session_expired"
  | "offline"
  | "disabled"
  | "riot"
  | "content"
  | "storage"
  | "other";

export interface AppError {
  kind: AppErrorKind;
  message: string;
}

export type Tab = "shop" | "wishlist" | "collection" | "history" | "settings";

export interface Weapon {
  uuid: string;
  name: string;
  category: string;
  image: string | null;
  ownedSkins: number;
  totalSkins: number;
  wishlistedSkins: number;
}

export interface WeaponSkins {
  weapon: Weapon;
  lines: SkinLine[];
}

export interface CatalogStatus {
  state: "loaded" | "loading" | "missing";
  progress: number;
  total: number;
}

export interface Check {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

export interface Diagnostics {
  dataDir: string;
  vaultOpen: boolean;
  signedIn: boolean;
  shard: string | null;
  catalog: CatalogStatus;
  cachedStore: boolean;
  checks: Check[];
}

import { create } from "zustand";
import { api, normalize } from "./api";
import { ensurePermission } from "./notifications";
import { isMobile } from "./platform";
import type {
  AppError,
  Bundle,
  CatalogStatus,
  Collection,
  History,
  SessionInfo,
  Settings,
  SkinDetail,
  SkinLine,
  Store,
  Tab,
  Wallet,
  Weapon,
  WeaponSkins,
  Wishlist,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  currency: "EUR",
  notifyDaily: false,
  notifyHour: 0,
  notifyMinute: 5,
  notifyWishlist: true,
  notifyBundles: true,
  storefrontV3: false,
  sounds: true,
  haptics: true,
  autostart: false,
  closeToTray: true,
};

export type Sheet =
  | { kind: "skin"; detail: SkinDetail | null; loading: boolean }
  | { kind: "line"; line: SkinLine }
  | { kind: "bundle"; bundle: Bundle }
  | { kind: "weapon"; weaponUuid: string };

interface AppState {
  booted: boolean;
  bootError: AppError | null;
  session: SessionInfo | null;
  busy: boolean;
  tab: Tab;

  store: Store | null;
  storeLoading: boolean;
  storeError: AppError | null;
  wallet: Wallet | null;
  wishlist: Wishlist | null;
  collection: Collection | null;
  collectionLoading: boolean;
  history: History | null;
  weapons: Weapon[] | null;
  weaponSkins: Record<string, WeaponSkins>;
  settings: Settings;
  sheets: Sheet[];
  catalog: CatalogStatus | null;

  init: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setTab: (tab: Tab) => void;
  refreshStore: (force?: boolean) => Promise<void>;
  refreshWallet: () => Promise<void>;
  loadWishlist: () => Promise<void>;
  loadWeapons: () => Promise<void>;
  loadWeaponSkins: (weaponUuid: string) => Promise<void>;
  toggleWish: (skinUuid: string, wishlisted: boolean) => Promise<void>;
  loadCollection: (force?: boolean) => Promise<void>;
  loadHistory: () => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  openSkin: (skinUuid: string) => Promise<void>;
  openLine: (line: SkinLine) => void;
  openBundle: (bundle: Bundle) => void;
  openWeapon: (weaponUuid: string) => void;
  closeSheet: () => void;
  closeAllSheets: () => void;
  watchCatalog: () => void;
}

function setWishFlag(store: Store | null, skinUuid: string, wishlisted: boolean): Store | null {
  if (!store) return store;
  const mark = <T extends { skinUuid: string; wishlisted: boolean }>(o: T): T =>
    o.skinUuid === skinUuid ? { ...o, wishlisted } : o;
  return {
    ...store,
    daily: store.daily.map(mark),
    nightMarket: store.nightMarket ? { ...store.nightMarket, offers: store.nightMarket.offers.map(mark) } : null,
  };
}

function setWeaponWish(all: Record<string, WeaponSkins>, skinUuid: string, wishlisted: boolean): Record<string, WeaponSkins> {
  const out: Record<string, WeaponSkins> = {};
  for (const [k, ws] of Object.entries(all)) {
    const hit = ws.lines.some((l) => l.skinUuid === skinUuid);
    if (!hit) {
      out[k] = ws;
      continue;
    }
    const lines = ws.lines.map((l) => (l.skinUuid === skinUuid ? { ...l, wishlisted } : l));
    const delta = wishlisted ? 1 : -1;
    out[k] = { weapon: { ...ws.weapon, wishlistedSkins: Math.max(0, ws.weapon.wishlistedSkins + delta) }, lines };
  }
  return out;
}

let catalogTimer: number | null = null;

export const useApp = create<AppState>((set, get) => ({
  booted: false,
  bootError: null,
  session: null,
  busy: false,
  tab: "shop",

  store: null,
  storeLoading: false,
  storeError: null,
  wallet: null,
  wishlist: null,
  collection: null,
  collectionLoading: false,
  history: null,
  weapons: null,
  weaponSkins: {},
  settings: DEFAULT_SETTINGS,
  sheets: [],
  catalog: null,

  async init() {
    try {
      const session = await api.sessionInit();
      const settings = await api.getSettings().catch(() => DEFAULT_SETTINGS);
      set({ session, settings, booted: true, bootError: null });
      if (isMobile && (settings.notifyDaily || settings.notifyWishlist || settings.notifyBundles)) void ensurePermission();
      if (session.signedIn || session.player) {
        void get().refreshStore();
        void get().refreshWallet();
        void get().loadWishlist();
      }
    } catch (e) {
      set({ bootError: normalize(e), booted: true });
    }
  },

  async login() {
    set({ busy: true });
    try {
      const player = await api.login();
      const session = get().session;
      set({
        session: { ...(session ?? { installDate: "", appVersion: "", disabledMessage: null }), player, signedIn: true, offline: false },
        storeError: null,
      });
      await Promise.all([get().refreshStore(true), get().refreshWallet(), get().loadWishlist()]);
    } catch (e) {
      const err = normalize(e);
      if (err.kind !== "login_cancelled") set({ storeError: err });
    } finally {
      set({ busy: false });
    }
  },

  async logout() {
    set({ busy: true });
    try {
      await api.logout();
    } finally {
      set({
        busy: false,
        session: get().session ? { ...get().session!, player: null, signedIn: false } : null,
        store: null,
        wallet: null,
        wishlist: null,
        collection: null,
        history: null,
        weapons: null,
        weaponSkins: {},
        settings: DEFAULT_SETTINGS,
        sheets: [],
        tab: "shop",
      });
    }
  },

  setTab(tab) {
    set({ tab });
    if (tab === "collection" && !get().collection) void get().loadCollection();
    if (tab === "history") void get().loadHistory();
    if (tab === "wishlist") {
      void get().loadWishlist();
      void get().loadWeapons();
    }
  },

  async refreshStore(force = false) {
    set({ storeLoading: true });
    try {
      const store = await api.getStore(force);
      set({ store, storeError: null });
      void get().loadWishlist();
      if (get().weapons) void get().loadWeapons();
    } catch (e) {
      const err = normalize(e);
      set({ storeError: err });
      if (err.kind === "content") get().watchCatalog();
    } finally {
      set({ storeLoading: false });
    }
  },

  watchCatalog() {
    if (catalogTimer) return;
    const tick = async () => {
      try {
        const catalog = await api.catalogStatus();
        set({ catalog });
        if (catalog.state === "loaded") {
          catalogTimer = null;
          set({ storeError: null });
          void get().refreshStore(true);
          void get().loadWishlist();
          if (get().weapons !== null || get().tab === "wishlist") void get().loadWeapons();
          if (get().tab === "collection") void get().loadCollection(true);
          return;
        }
        if (catalog.state === "missing") {
          catalogTimer = null;
          void get().refreshStore(true);
          return;
        }
      } catch {
        set({ catalog: null });
      }
      catalogTimer = window.setTimeout(tick, 2500);
    };
    catalogTimer = window.setTimeout(tick, 1500);
  },

  async refreshWallet() {
    try {
      set({ wallet: await api.getWallet() });
    } catch {
      return;
    }
  },

  async loadWishlist() {
    try {
      set({ wishlist: await api.wishlistList() });
    } catch (e) {
      set({ storeError: normalize(e) });
    }
  },

  async loadWeapons() {
    try {
      set({ weapons: await api.getWeapons(), storeError: null });
    } catch (e) {
      const err = normalize(e);
      set({ storeError: err });
      if (err.kind === "content") get().watchCatalog();
    }
  },

  async loadWeaponSkins(weaponUuid) {
    try {
      const ws = await api.getWeaponSkins(weaponUuid);
      set({ weaponSkins: { ...get().weaponSkins, [weaponUuid]: ws } });
    } catch {
      return;
    }
  },

  async toggleWish(skinUuid, wishlisted) {
    const next = !wishlisted;
    if (next && isMobile) void ensurePermission();
    const { store, sheets, weaponSkins, weapons } = get();
    set({
      store: setWishFlag(store, skinUuid, next),
      weaponSkins: setWeaponWish(weaponSkins, skinUuid, next),
      weapons: weapons?.map((w) => {
        const ws = weaponSkins[w.uuid];
        if (!ws || !ws.lines.some((l) => l.skinUuid === skinUuid)) return w;
        return { ...w, wishlistedSkins: Math.max(0, w.wishlistedSkins + (next ? 1 : -1)) };
      }) ?? null,
      sheets: sheets.map((s) => (s.kind === "skin" && s.detail?.skinUuid === skinUuid ? { ...s, detail: { ...s.detail, wishlisted: next } } : s)),
    });
    try {
      const wishlist = next ? await api.wishlistAdd(skinUuid) : await api.wishlistRemove(skinUuid);
      set({ wishlist });
    } catch {
      set({ store: setWishFlag(get().store, skinUuid, wishlisted), weaponSkins: setWeaponWish(get().weaponSkins, skinUuid, wishlisted) });
    }
  },

  async loadCollection(force = false) {
    set({ collectionLoading: true });
    try {
      set({ collection: await api.getCollection(force) });
    } catch (e) {
      const err = normalize(e);
      set({ storeError: err });
      if (err.kind === "content") get().watchCatalog();
    } finally {
      set({ collectionLoading: false });
    }
  },

  async loadHistory() {
    try {
      set({ history: await api.getHistory() });
    } catch (e) {
      set({ storeError: normalize(e) });
    }
  },

  async saveSettings(patch) {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      set({ settings: await api.setSettings(settings) });
    } catch {
      return;
    }
  },

  async openSkin(skinUuid) {
    const placeholder: Sheet = { kind: "skin", detail: null, loading: true };
    set({ sheets: [...get().sheets, placeholder] });
    try {
      const detail = await api.openSkin(skinUuid);
      set({ sheets: get().sheets.map((s) => (s === placeholder ? { kind: "skin", detail, loading: false } : s)) });
    } catch {
      set({ sheets: get().sheets.filter((s) => s !== placeholder) });
    }
  },

  openLine(line) {
    set({ sheets: [...get().sheets, { kind: "line", line }] });
  },

  openBundle(bundle) {
    set({ sheets: [...get().sheets, { kind: "bundle", bundle }] });
  },

  openWeapon(weaponUuid) {
    set({ sheets: [...get().sheets, { kind: "weapon", weaponUuid }] });
    if (!get().weaponSkins[weaponUuid]) void get().loadWeaponSkins(weaponUuid);
  },

  closeSheet() {
    set({ sheets: get().sheets.slice(0, -1) });
  },

  closeAllSheets() {
    set({ sheets: [] });
  },
}));

export function useTopSheet(): Sheet | null {
  return useApp((s) => s.sheets[s.sheets.length - 1] ?? null);
}

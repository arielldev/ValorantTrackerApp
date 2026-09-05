import { invoke } from "@tauri-apps/api/core";
import type {
  AppError,
  Collection,
  History,
  Player,
  SessionInfo,
  Settings,
  SkinDetail,
  Store,
  Wallet,
  CatalogStatus,
  Diagnostics,
  Weapon,
  WeaponSkins,
  Wishlist,
} from "./types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri) {
    throw { kind: "other", message: "ValoStore only runs inside the app." } satisfies AppError;
  }
  try {
    return await invoke<T>(cmd, args);
  } catch (e) {
    throw normalize(e);
  }
}

export function normalize(e: unknown): AppError {
  if (e && typeof e === "object" && "kind" in e && "message" in e) return e as AppError;
  return { kind: "other", message: e instanceof Error ? e.message : String(e) };
}

export const api = {
  sessionInit: () => call<SessionInfo>("session_init"),
  login: () => call<Player>("login"),
  logout: () => call<void>("logout"),
  getPlayer: () => call<Player | null>("get_player"),
  getStore: (force = false) => call<Store>("get_store", { force }),
  getWallet: () => call<Wallet>("get_wallet"),
  getCollection: (force = false) => call<Collection>("get_collection", { force }),
  getHistory: () => call<History>("get_history"),
  wishlistList: () => call<Wishlist>("wishlist_list"),
  wishlistAdd: (skinUuid: string) => call<Wishlist>("wishlist_add", { skinUuid }),
  wishlistRemove: (skinUuid: string) => call<Wishlist>("wishlist_remove", { skinUuid }),
  getSettings: () => call<Settings>("get_settings"),
  setSettings: (settings: Settings) => call<Settings>("set_settings", { settings }),
  openSkin: (skinUuid: string) => call<SkinDetail>("open_skin", { skinUuid }),
  getWeapons: () => call<Weapon[]>("get_weapons"),
  getWeaponSkins: (weaponUuid: string) => call<WeaponSkins>("get_weapon_skins", { weaponUuid }),
  catalogStatus: () => call<CatalogStatus>("catalog_status"),
  diagnose: () => call<Diagnostics>("diagnose"),
  getLogs: () => call<string[]>("get_logs"),
};

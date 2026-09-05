import { isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { isTauri } from "./api";

export async function ensurePermission(): Promise<boolean> {
  if (!isTauri) return false;
  try {
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function rotationLocalTime(): { hour: number; minute: number } {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return { hour: d.getHours(), minute: d.getMinutes() };
}

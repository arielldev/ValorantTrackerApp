import { isTauri } from "./api";

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

export const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
export const isDesktop = isTauri && !isMobile;
export const isWindows = isDesktop && /Windows/i.test(ua);
export const isMac = isDesktop && /Mac OS X/i.test(ua);

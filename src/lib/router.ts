import { useEffect, useState } from "react";
import type { Tab } from "./types";

export const TABS: Tab[] = ["shop", "wishlist", "collection", "history", "settings"];

export type Route = { kind: "tab"; tab: Tab } | { kind: "notfound"; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").split("?")[0].replace(/\/$/, "");
  if (path === "") return { kind: "tab", tab: "shop" };
  if ((TABS as string[]).includes(path)) return { kind: "tab", tab: path as Tab };
  return { kind: "notfound", path };
}

export function navigate(tab: Tab) {
  if (typeof window === "undefined") return;
  const next = `#/${tab}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => (typeof window === "undefined" ? { kind: "tab", tab: "shop" } : parseHash(window.location.hash)));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

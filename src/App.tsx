import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { navigate, useRoute } from "@/lib/router";
import { isDesktop } from "@/lib/platform";
import { sfx } from "@/lib/sfx";
import { haptics } from "@/lib/haptics";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TabBar } from "@/components/TabBar";
import { TitleBar } from "@/components/desktop/TitleBar";
import { SideNav } from "@/components/desktop/SideNav";
import { SkinSheet } from "@/components/skin/SkinSheet";
import { BundleSheet } from "@/components/bundle/BundleSheet";
import { WeaponSheet } from "@/components/weapon/WeaponSheet";
import { Boot } from "@/screens/Boot";
import { Login } from "@/screens/Login";
import { Shop } from "@/screens/Shop";
import { Wishlist } from "@/screens/Wishlist";
import { Collection } from "@/screens/Collection";
import { History } from "@/screens/History";
import { Settings } from "@/screens/Settings";
import { NotFound } from "@/screens/NotFound";

function Sheets() {
  const sheets = useApp((s) => s.sheets);
  const closeSheet = useApp((s) => s.closeSheet);
  const at = (kind: string) => sheets.findIndex((s) => s.kind === kind);
  const stackProps = (kind: string) => {
    const i = at(kind);
    return { open: i >= 0, stacked: i >= 0 && i < sheets.length - 1, depth: Math.max(0, i) };
  };
  const weaponIdx = at("weapon");
  const skinIdx = at("skin");
  const bundleIdx = at("bundle");
  const weaponData = weaponIdx >= 0 ? sheets[weaponIdx] : null;
  const skinData = skinIdx >= 0 ? sheets[skinIdx] : null;
  const bundleData = bundleIdx >= 0 ? sheets[bundleIdx] : null;
  const toggleWish = useApp((s) => s.toggleWish);
  const openSkin = useApp((s) => s.openSkin);
  const weaponSkins = useApp((s) => s.weaponSkins);
  const currency = useApp((s) => s.settings.currency);
  const close = () => {
    sfx.play("close");
    closeSheet();
  };
  return (
    <>
      <WeaponSheet
        {...stackProps("weapon")}
        data={weaponData?.kind === "weapon" ? (weaponSkins[weaponData.weaponUuid] ?? null) : null}
        onClose={close}
        onOpenSkin={openSkin}
        onToggleWish={toggleWish}
      />
      <BundleSheet {...stackProps("bundle")} bundle={bundleData?.kind === "bundle" ? bundleData.bundle : null} currency={currency} onClose={close} onOpenSkin={openSkin} />
      <SkinSheet
        {...stackProps("skin")}
        loading={skinData?.kind === "skin" ? skinData.loading : false}
        detail={skinData?.kind === "skin" ? skinData.detail : null}
        currency={currency}
        onClose={close}
        onToggleWish={toggleWish}
      />
    </>
  );
}

function Main() {
  const route = useRoute();
  const booted = useApp((s) => s.booted);
  const bootError = useApp((s) => s.bootError);
  const session = useApp((s) => s.session);
  const busy = useApp((s) => s.busy);
  const storeError = useApp((s) => s.storeError);
  const wishlist = useApp((s) => s.wishlist);
  const store = useApp((s) => s.store);
  const init = useApp((s) => s.init);
  const login = useApp((s) => s.login);
  const setTab = useApp((s) => s.setTab);
  const closeAllSheets = useApp((s) => s.closeAllSheets);
  const settings = useApp((s) => s.settings);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    sfx.setEnabled(settings.sounds);
    haptics.setEnabled(settings.haptics);
  }, [settings.sounds, settings.haptics]);

  useEffect(() => {
    if (route.kind === "tab") setTab(route.tab);
    closeAllSheets();
  }, [route, setTab, closeAllSheets]);

  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  if (!booted) return <Boot error={bootError} onRetry={() => void init()} />;

  const signedIn = !!session?.signedIn;
  const hasCache = !!session?.player && (session.offline || !!store);
  if (!signedIn && !hasCache) {
    return <Login busy={busy} error={storeError} expired={!!session?.player} onLogin={() => void login()} />;
  }

  const inShop = wishlist?.items.filter((i) => i.state.kind === "in_shop" || i.state.kind === "night_market").length ?? 0;
  const badge = { wishlist: inShop || undefined };
  const active = route.kind === "tab" ? route.tab : "shop";

  const page =
    route.kind === "notfound" ? (
      <NotFound path={route.path} />
    ) : (
      <div key={route.tab} className="flex min-h-0 flex-1 flex-col animate-fade">
        {route.tab === "shop" && <Shop />}
        {route.tab === "wishlist" && <Wishlist />}
        {route.tab === "collection" && <Collection />}
        {route.tab === "history" && <History />}
        {route.tab === "settings" && <Settings />}
      </div>
    );

  if (isDesktop) {
    return (
      <>
        <div className="flex min-h-0 flex-1">
          <SideNav active={active} onChange={navigate} player={session?.player ?? null} badge={badge} />
          <main className="flex min-h-0 flex-1 flex-col">{page}</main>
        </div>
        <Sheets />
      </>
    );
  }

  return (
    <>
      {page}
      <TabBar active={active} onChange={navigate} badge={badge} />
      <Sheets />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex h-dvh flex-col overflow-hidden bg-obsidian">
        {isDesktop ? <TitleBar /> : null}
        <Main />
      </div>
    </ErrorBoundary>
  );
}

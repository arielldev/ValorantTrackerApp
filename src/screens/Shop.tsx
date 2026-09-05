import { useApp } from "@/lib/store";
import { ErrorBanner } from "@/components/ErrorBanner";
import { fmtAgo } from "@/lib/format";
import { Banner, Button, HeroRule, Label, Screen } from "@/components/ui";
import { ShopHeader } from "@/components/shop/ShopHeader";
import { CountdownBar } from "@/components/shop/CountdownBar";
import { SkinGrid } from "@/components/shop/SkinGrid";
import { BundleCard } from "@/components/shop/BundleCard";
import { NightMarketSection } from "@/components/shop/NightMarketSection";
import { AccessoryRow } from "@/components/shop/AccessoryRow";
import { ShopRating } from "@/components/shop/ShopRating";

export function Shop() {
  const session = useApp((s) => s.session);
  const store = useApp((s) => s.store);
  const loading = useApp((s) => s.storeLoading);
  const error = useApp((s) => s.storeError);
  const wallet = useApp((s) => s.wallet);
  const settings = useApp((s) => s.settings);
  const refreshStore = useApp((s) => s.refreshStore);
  const refreshWallet = useApp((s) => s.refreshWallet);
  const openSkin = useApp((s) => s.openSkin);
  const openBundle = useApp((s) => s.openBundle);
  const toggleWish = useApp((s) => s.toggleWish);
  const login = useApp((s) => s.login);

  const refresh = async () => {
    await Promise.all([refreshStore(true), refreshWallet()]);
  };

  const hasBundles = !!store?.bundles.length;

  return (
    <Screen
      onRefresh={refresh}
      refreshing={loading}
      header={
        <ShopHeader player={session?.player ?? null} wallet={wallet} fetchedAt={store?.fetchedAt ?? null} refreshing={loading} onRefresh={() => void refresh()} />
      }
    >
      <div className="flex flex-col gap-7 pt-2 md:gap-10">
        {store?.offline ? (
          <Banner tone="offline" className="-mx-4 md:mx-0">
            Offline — last fetched {fmtAgo(store.fetchedAt)}
          </Banner>
        ) : null}
        {error && error.kind === "session_expired" ? (
          <Banner tone="gold" className="-mx-4 md:mx-0" action={<Button variant="ghost" size="sm" onClick={() => void login()}>Sign in</Button>}>
            Session expired
          </Banner>
        ) : error && !(error.kind === "offline" && store) ? (
          <ErrorBanner />
        ) : null}

        <CountdownBar expiresAt={store?.dailyExpiresAt ?? null} />

        <ShopRating store={store} />

        {store?.nightMarket ? (
          <NightMarketSection market={store.nightMarket} currency={settings.currency} onOpen={openSkin} onToggleWish={toggleWish} />
        ) : null}

        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <section className="flex flex-col gap-4">
            <HeroRule title="Daily shop" meta={store ? <Label>{store.daily.length} offers</Label> : undefined} />
            <SkinGrid offers={store?.daily ?? null} currency={settings.currency} onOpen={openSkin} onToggleWish={toggleWish} />
          </section>

          {hasBundles ? (
            <section className="flex flex-col gap-4 xl:sticky xl:top-0">
              <HeroRule title="Featured" />
              <div className="flex flex-col gap-3">
                {store!.bundles.map((b) => (
                  <BundleCard key={b.uuid} bundle={b} currency={settings.currency} onOpen={openBundle} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {store ? <AccessoryRow items={store.accessories} expiresAt={store.accessoriesExpireAt} /> : null}
      </div>
    </Screen>
  );
}

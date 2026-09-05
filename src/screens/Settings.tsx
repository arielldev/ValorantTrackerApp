import { useState } from "react";
import { useApp } from "@/lib/store";
import { CURRENCIES } from "@/lib/currency";
import { rotationLocalTime, ensurePermission } from "@/lib/notifications";
import { sfx } from "@/lib/sfx";
import { haptics } from "@/lib/haptics";
import { isDesktop } from "@/lib/platform";
import { Avatar, Body, Button, Display, HeroRule, Label, Screen, Select, TimeField, Toggle } from "@/components/ui";
import { api } from "@/lib/api";
import type { Diagnostics } from "@/lib/types";
import { cn } from "@/lib/cn";

function Setting({ label, hint, leading, children }: { label: string; hint?: string; leading?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline py-4">
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body text-bone">{label}</span>
        {hint ? <span className="text-small text-ash">{hint}</span> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function Settings() {
  const session = useApp((s) => s.session);
  const settings = useApp((s) => s.settings);
  const saveSettings = useApp((s) => s.saveSettings);
  const logout = useApp((s) => s.logout);
  const busy = useApp((s) => s.busy);
  const [confirm, setConfirm] = useState(false);
  const [denied, setDenied] = useState(false);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [diagBusy, setDiagBusy] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);

  async function runDiag() {
    setDiagBusy(true);
    try {
      setDiag(await api.diagnose());
    } catch (e) {
      setDiag(null);
      sfx.play("error");
      console.error(e);
    } finally {
      setDiagBusy(false);
    }
  }
  const rotation = rotationLocalTime();
  const rotationLabel = `${pad(rotation.hour)}:${pad(rotation.minute)}`;

  async function setAlert(key: "notifyDaily" | "notifyWishlist" | "notifyBundles", on: boolean) {
    if (on) {
      const ok = await ensurePermission();
      if (!ok) {
        setDenied(true);
        sfx.play("error");
        return;
      }
      setDenied(false);
      sfx.play("confirm");
    }
    await saveSettings({ [key]: on });
  }

  return (
    <Screen
      header={
        <div className="px-4 pb-3 safe-top md:px-10">
          <Label className="hidden md:block">Preferences</Label>
          <Display as="h1" size="d1">
            Settings
          </Display>
        </div>
      }
    >
      <div className="flex flex-col gap-8 pt-1 md:max-w-3xl">
        <section className="flex flex-col gap-2">
          <HeroRule title="Account" />
          <Setting
            leading={<Avatar online={!!session?.player} size={44} />}
            label={session?.player ? `${session.player.gameName}#${session.player.tagLine}` : "Not signed in"}
            hint={session?.player ? `Online · Region ${session.player.region}` : undefined}
          >
            {session?.player ? (
              confirm ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>
                    Keep
                  </Button>
                  <Button variant="danger" size="sm" loading={busy} sound="error" onClick={() => void logout()}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
                  Sign out
                </Button>
              )
            ) : null}
          </Setting>
          {confirm ? (
            <Body tone="ash" small>
              Signing out wipes cookies, wishlist, history and cached shop from this device.
            </Body>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <HeroRule title="Alerts" meta={<Label>Rotates {rotationLabel}</Label>} />
          <Setting label="Wishlist" hint="Right after reset, only when a starred skin shows up">
            <Toggle label="Wishlist alerts" checked={settings.notifyWishlist} onChange={(v) => void setAlert("notifyWishlist", v)} />
          </Setting>
          <Setting label="Bundles" hint="When a new featured bundle appears">
            <Toggle label="Bundle alerts" checked={settings.notifyBundles} onChange={(v) => void setAlert("notifyBundles", v)} />
          </Setting>
          <Setting label="Daily shop" hint={settings.notifyDaily ? "All four skins, by rarity, at the time below. Wishlist hits arrive with it." : "Every day's four skins at a time you pick"}>
            <Toggle label="Daily shop summary" checked={settings.notifyDaily} onChange={(v) => void setAlert("notifyDaily", v)} />
          </Setting>
          {settings.notifyDaily ? (
            <Setting label="Notify at" hint={`Defaults to the rotation, ${rotationLabel} your time`}>
              <TimeField hour={settings.notifyHour} minute={settings.notifyMinute} onChange={(h, m) => void saveSettings({ notifyHour: h, notifyMinute: m })} />
            </Setting>
          ) : null}
          {settings.notifyDaily && (settings.notifyHour !== rotation.hour || settings.notifyMinute !== rotation.minute) ? (
            <button className="label self-start text-gold" onClick={() => void saveSettings({ notifyHour: rotation.hour, notifyMinute: rotation.minute })}>
              Use rotation time
            </button>
          ) : null}
          {denied ? (
            <Body tone="signal" small>
              Notifications are blocked for ValoStore. Enable them in your system settings and try again.
            </Body>
          ) : null}
        </section>

        <section className="flex flex-col gap-2">
          <HeroRule title="Display" />
          <Setting label="Currency" hint="Real-money estimate under VP prices">
            <Select
              value={settings.currency}
              onChange={(v) => void saveSettings({ currency: v })}
              options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.code} ${c.symbol}` }))}
            />
          </Setting>
          <Setting label="UI sounds">
            <Toggle
              label="UI sounds"
              checked={settings.sounds}
              onChange={(v) => {
                sfx.setEnabled(v);
                if (v) sfx.play("confirm");
                void saveSettings({ sounds: v });
              }}
            />
          </Setting>
          {!isDesktop ? (
            <Setting label="Haptics">
              <Toggle
                label="Haptics"
                checked={settings.haptics}
                onChange={(v) => {
                  haptics.setEnabled(v);
                  if (v) haptics.success();
                  void saveSettings({ haptics: v });
                }}
              />
            </Setting>
          ) : null}
        </section>

        {isDesktop ? (
          <section className="flex flex-col gap-2">
            <HeroRule title="Desktop" />
            <Setting label="Launch at login" hint="Starts minimized in the tray">
              <Toggle label="Launch at login" checked={settings.autostart} onChange={(v) => void saveSettings({ autostart: v })} />
            </Setting>
            <Setting label="Close to tray" hint="Closing the window keeps the shop watcher running">
              <Toggle label="Close to tray" checked={settings.closeToTray} onChange={(v) => void saveSettings({ closeToTray: v })} />
            </Setting>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <HeroRule title="Advanced" />
          <Setting label="Legacy storefront (v2)" hint="Try this if the daily shop stops loading">
            <Toggle label="Legacy storefront" checked={settings.storefrontV3} onChange={(v) => void saveSettings({ storefrontV3: v })} />
          </Setting>
        </section>

        <section className="flex flex-col gap-2">
          <HeroRule title="Diagnostics" meta={<Button variant="ghost" size="sm" loading={diagBusy} onClick={() => void runDiag()}>Run</Button>} />
          {diag ? (
            <ul className="flex flex-col">
              <li className="flex items-center justify-between border-b border-hairline py-2 text-small">
                <span className="text-ash">Signed in</span>
                <span className={cn("tabular", diag.signedIn ? "text-gold" : "text-signal")}>{diag.signedIn ? `yes · ${diag.shard ?? ""}` : "no"}</span>
              </li>
              <li className="flex items-center justify-between border-b border-hairline py-2 text-small">
                <span className="text-ash">Skin catalog</span>
                <span className={cn("tabular", diag.catalog.state === "loaded" ? "text-gold" : "text-bone")}>
                  {diag.catalog.state} {diag.catalog.state === "loading" ? `${diag.catalog.progress}/${diag.catalog.total}` : ""}
                </span>
              </li>
              <li className="flex items-center justify-between border-b border-hairline py-2 text-small">
                <span className="text-ash">Vault · cached shop</span>
                <span className="tabular text-bone">{diag.vaultOpen ? "open" : "closed"} · {diag.cachedStore ? "yes" : "no"}</span>
              </li>
              {diag.checks.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3 border-b border-hairline py-2 text-small">
                  <span className="truncate text-ash">{c.name}</span>
                  <span className={cn("shrink-0 tabular", c.ok ? "text-gold" : "text-signal")}>{c.detail} · {c.ms} ms</span>
                </li>
              ))}
              <li className="py-2 text-micro text-smoke break-all">{diag.dataDir}</li>
            </ul>
          ) : (
            <Body tone="ash" small>Checks reachability of valorant-api.com and Riot, and the state of the local catalog.</Body>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <HeroRule title="Debug log" meta={<Button variant="ghost" size="sm" onClick={() => void api.getLogs().then(setLogs).catch(() => setLogs(["could not read log"]))}>Refresh</Button>} />
          {logs ? (
            <pre className="max-h-80 overflow-auto bg-graphite p-3 text-[10px] leading-relaxed text-bone whitespace-pre-wrap break-all select-text">
              {logs.slice(-80).join("\n")}
            </pre>
          ) : (
            <Body tone="ash" small>Backend steps, newest at the bottom. Screenshot this when something does not load.</Body>
          )}
        </section>

        <footer className="flex flex-col gap-2 pb-4">
          <Label>ValoStore {session?.appVersion ?? ""}</Label>
          <Body tone="smoke" small>
            Not affiliated with or endorsed by Riot Games. Uses unofficial endpoints that may change or stop working at any time.
          </Body>
        </footer>
      </div>
    </Screen>
  );
}

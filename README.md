# ValoStore

A view-only store viewer for VALORANT. Shows your daily shop, night market, bundles, wallet, wishlist and collection, and pings you when a skin you want rotates in. Nothing leaves your device and the app never buys, equips or touches your account.

Android first, Windows desktop second. Built with Tauri 2, a Rust core and a React frontend.

## What it does

- Daily shop with a live reset countdown, the featured bundle and the accessory store
- Night market when it is live
- Wishlist. Star a skin anywhere and it lights up the day it shows up, with a total in VP and in your currency
- Collection with owned levels and chromas, store value, battle pass count and a rough spend estimate
- Shop history from the day you install it, with what you bought
- Community grade for every skin line and a grade for the whole shop, F to SSS. Rarity is not part of it
- VP pack calculator: what you are missing and which packs cover it, priced in your currency
- Alerts: wishlist hits right after reset, new bundles, and an optional daily summary at a time you pick
- Desktop lives in the tray and checks the shop for you without keeping a window open

## How it signs in

Sign-in happens on Riot's own page inside a web view. The app keeps the session cookie and the short-lived tokens Riot hands back. It never sees your password. Sign out wipes everything on the device.

Store and wallet data come straight from Riot's player-data endpoints, the same ones the game client uses. Skin names, images and videos come from valorant-api.com. Those endpoints are unofficial and can change; the app has a remote flag so store fetching can be disabled if they break.

## Building

Requirements: Node 22, Rust 1.77 or newer, and for Android: Android Studio with SDK, NDK and build tools, plus Developer Mode on Windows so the build can create symlinks.

```
npm install
npm run tauri dev          # desktop
npm run android            # android, device over USB
npm run android:build      # signed release apk
```

The Android build signs with `src-tauri/gen/android/key.properties`. Keep that file and the keystore next to it out of git and backed up somewhere safe.

Tests:

```
npm test                   # frontend
npm run test:rust          # rust core
```

## Layout

```
src/                 React frontend, Tailwind, zustand
src-tauri/src/       Rust core: auth, store, catalog, vault, notifications
plugins/valorant-auth/   Kotlin: login web view, keystore, background shop check
```

## License

MIT. See `LICENSE`.

The skin renders, videos and names shown in the app belong to Riot Games and are fetched at runtime; none of them are bundled with this repository.

## Legal

Not affiliated with or endorsed by Riot Games. VALORANT and Riot Games are trademarks of Riot Games, Inc.

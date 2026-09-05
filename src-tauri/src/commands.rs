use std::collections::HashMap;

use chrono::Utc;
use tauri::{AppHandle, Manager, State};

use crate::auth::{self, Session};
use crate::content;
use crate::error::{AppError, AppResult};
use crate::killswitch;
use crate::models::*;
use crate::resolve::{self, OwnedSets};
use crate::riot::{RiotClient, RiotHeaders};
use crate::secrets;
use crate::vault::WishEntry;
use crate::SharedState;

type St<'a> = State<'a, SharedState>;

const OWNED_TTL: i64 = 10 * 60;

fn now() -> i64 {
    Utc::now().timestamp()
}

async fn ensure_session(app: &AppHandle, state: &SharedState) -> AppResult<Session> {
    {
        let auth = state.auth.lock().await;
        if let Some(s) = &auth.session {
            if !s.is_expired(now()) {
                return Ok(s.clone());
            }
        }
    }
    log::info!("session: silent re-auth");
    let cookies = secrets::get(app, secrets::AUTH_COOKIES).await?.ok_or(AppError::NotSignedIn)?;
    let (tokens, jar) = auth::reauth_with_cookies(&cookies).await.map_err(|e| {
        log::warn!("session: re-auth failed: {e}");
        e
    })?;
    let session = auth::complete(&state.http, tokens).await?;
    log::info!("session: ok shard={}", session.shard);
    secrets::set(app, secrets::AUTH_COOKIES, &jar).await?;
    state.auth.lock().await.session = Some(session.clone());
    Ok(session)
}

fn catalog_loading_error() -> AppError {
    let done = content::CATALOG_PROGRESS.load(std::sync::atomic::Ordering::Relaxed);
    AppError::Content(format!("loading {done}/{}", content::CATALOG_FILES))
}

pub fn spawn_catalog_refresh(state: &SharedState) {
    if content::CATALOG_FETCHING.swap(true, std::sync::atomic::Ordering::SeqCst) {
        return;
    }
    let st = state.clone();
    tauri::async_runtime::spawn(async move {
        let dir = st.content.lock().await.dir();
        log::info!("catalog: download starting into {}", dir.display());
        match content::Catalog::fetch_standalone(dir).await {
            Ok(loaded) => {
                log::info!("catalog: loaded {} skins, client {}", loaded.skins.len(), loaded.client_version);
                st.content.lock().await.set_loaded(loaded)
            }
            Err(e) => log::warn!("catalog download failed: {e}"),
        }
        content::CATALOG_FETCHING.store(false, std::sync::atomic::Ordering::SeqCst);
        st.wake.notify_one();
    });
}

async fn ensure_catalog(state: &SharedState) -> AppResult<()> {
    let (loaded, stale) = {
        let mut c = state.content.lock().await;
        (c.load_cached(), c.needs_refresh())
    };
    if stale {
        spawn_catalog_refresh(state);
    }
    if loaded {
        Ok(())
    } else {
        log::info!("catalog: not loaded yet");
        Err(catalog_loading_error())
    }
}

async fn client_version(state: &SharedState) -> AppResult<String> {
    if let Ok(c) = state.content.try_lock() {
        if let Ok(l) = c.get() {
            return Ok(l.client_version.clone());
        }
    }
    if let Some(v) = state.auth.lock().await.client_version.clone() {
        return Ok(v);
    }
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct V {
        riot_client_version: String,
    }
    #[derive(serde::Deserialize)]
    struct E {
        data: V,
    }
    let e: E = state.http.get("https://valorant-api.com/v1/version").send().await?.error_for_status().map_err(|e| AppError::Content(e.to_string()))?.json().await?;
    state.auth.lock().await.client_version = Some(e.data.riot_client_version.clone());
    Ok(e.data.riot_client_version)
}

async fn headers_for(state: &SharedState, session: &Session) -> AppResult<RiotHeaders> {
    Ok(RiotHeaders {
        access_token: session.access_token.clone(),
        entitlements: session.entitlements.clone(),
        client_version: client_version(state).await?,
    })
}

async fn fetch_owned(client: &RiotClient<'_>, puuid: &str) -> AppResult<OwnedSets> {
    crate::background::fetch_owned(client, puuid).await
}

async fn owned_sets(state: &SharedState, client: &RiotClient<'_>, puuid: &str, force: bool) -> AppResult<OwnedSets> {
    if !force {
        let vault = state.vault.lock().await;
        if let Some(o) = &vault.data.cached_owned {
            if now() - o.fetched_at < OWNED_TTL {
                return Ok(o.clone());
            }
        }
    }
    let owned = fetch_owned(client, puuid).await?;
    state.vault.lock().await.data.cached_owned = Some(owned.clone());
    Ok(owned)
}

async fn cached_owned(state: &SharedState) -> OwnedSets {
    state.vault.lock().await.data.cached_owned.clone().unwrap_or_default()
}

async fn price_map(state: &SharedState, client: &RiotClient<'_>) -> AppResult<HashMap<String, u32>> {
    {
        let auth = state.auth.lock().await;
        if let Some(p) = &auth.prices {
            return Ok(p.clone());
        }
    }
    let prices = client.offers().await?.price_map();
    log::info!("prices: {} offers with VP cost", prices.len());
    state.auth.lock().await.prices = Some(prices.clone());
    {
        let mut vault = state.vault.lock().await;
        vault.data.cached_prices = prices.clone();
        let _ = vault.save();
    }
    Ok(prices)
}

async fn cached_prices(state: &SharedState) -> HashMap<String, u32> {
    if let Some(p) = state.auth.lock().await.prices.clone() {
        return p;
    }
    state.vault.lock().await.data.cached_prices.clone()
}

async fn disabled_message(app: &AppHandle, state: &SharedState) -> Option<String> {
    let kill = state.kill.lock().await;
    kill.as_ref().and_then(|k| k.blocking_message(&app.package_info().version.to_string()))
}

fn is_transient(e: &AppError) -> bool {
    matches!(e, AppError::Offline | AppError::SessionExpired | AppError::NotSignedIn | AppError::Riot(_))
}

#[tauri::command]
pub async fn session_init(app: AppHandle, state: St<'_>) -> AppResult<SessionInfo> {
    let state = state.inner().clone();

    let key = secrets::vault_key(&app).await?;
    {
        let mut vault = state.vault.lock().await;
        if !vault.is_open() {
            vault.open(key)?;
        }
    }
    if let Ok(dir) = app.path().app_data_dir() {
        let _ = secrets::set(&app, "data_dir", &dir.to_string_lossy()).await;
    }

    log::info!("init: vault open, checking kill switch");
    let kill = killswitch::check(&state.http).await;
    *state.kill.lock().await = Some(kill);
    log::info!("init: kill switch ok");

    let _ = ensure_catalog(&state).await;

    let (signed_in, offline) = match ensure_session(&app, &state).await {
        Ok(s) => {
            let mut vault = state.vault.lock().await;
            vault.data.player = Some(s.player.clone());
            vault.save()?;
            (true, false)
        }
        Err(AppError::Offline) => (false, true),
        Err(AppError::NotSignedIn) => (false, false),
        Err(e) => {
            log::info!("silent re-auth failed: {e}");
            (false, false)
        }
    };

    let vault = state.vault.lock().await;
    state.close_to_tray.store(vault.data.settings.close_to_tray, std::sync::atomic::Ordering::Relaxed);
    crate::platform_apply_settings(&app, &vault.data.settings);
    Ok(SessionInfo {
        player: vault.data.player.clone(),
        signed_in,
        offline,
        install_date: vault.data.install_date.clone(),
        app_version: app.package_info().version.to_string(),
        disabled_message: disabled_message(&app, &state).await,
    })
}

#[tauri::command]
pub async fn login(app: AppHandle, state: St<'_>) -> AppResult<Player> {
    use tauri_plugin_valorant_auth::ValorantAuthExt;
    let state = state.inner().clone();

    let handle = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || handle.valorant_auth().login(auth::AUTHORIZE_URL))
        .await
        .map_err(|e| AppError::Other(e.to_string()))??;

    let tokens = auth::parse_redirect(&result.redirect_url).ok_or_else(|| AppError::Riot("no tokens in redirect".into()))?;
    let session = auth::complete(&state.http, tokens).await?;
    if !result.cookies.is_empty() {
        secrets::set(&app, secrets::AUTH_COOKIES, &result.cookies).await?;
    }
    let player = session.player.clone();
    state.auth.lock().await.session = Some(session);
    {
        let mut vault = state.vault.lock().await;
        vault.data.player = Some(player.clone());
        vault.save()?;
    }
    let _ = ensure_catalog(&state).await;
    Ok(player)
}

#[tauri::command]
pub async fn logout(app: AppHandle, state: St<'_>) -> AppResult<()> {
    let state = state.inner().clone();
    secrets::clear(&app).await?;
    {
        let mut auth = state.auth.lock().await;
        auth.session = None;
        auth.prices = None;
    }
    state.vault.lock().await.wipe()?;
    state.content.lock().await.wipe();

    let key = secrets::vault_key(&app).await?;
    let mut vault = state.vault.lock().await;
    vault.open(key)?;
    Ok(())
}

#[tauri::command]
pub async fn get_player(state: St<'_>) -> AppResult<Option<Player>> {
    Ok(state.vault.lock().await.data.player.clone())
}

#[tauri::command]
pub async fn get_store(app: AppHandle, state: St<'_>, force: Option<bool>) -> AppResult<Store> {
    load_store(&app, state.inner(), force.unwrap_or(false)).await
}

pub async fn fetch_store_for_notification(app: &AppHandle) -> AppResult<Store> {
    let state = app.state::<SharedState>().inner().clone();
    {
        let mut vault = state.vault.lock().await;
        if !vault.is_open() {
            let key = secrets::vault_key(app).await?;
            vault.open(key)?;
        }
    }
    load_store(app, &state, true).await
}

async fn load_store(app: &AppHandle, state: &SharedState, force: bool) -> AppResult<Store> {
    let app = app.clone();
    let state = state.clone();
    log::info!("store: load force={force}");

    if let Some(msg) = disabled_message(&app, &state).await {
        return Err(AppError::Disabled(msg));
    }

    let cached = |e: AppError| async {
        let vault = state.vault.lock().await;
        match &vault.data.cached_store {
            Some(s) if is_transient(&e) => Ok(Store { offline: true, ..s.clone() }),
            _ => Err(e),
        }
    };

    let session = match ensure_session(&app, &state).await {
        Ok(s) => s,
        Err(e) => return cached(e).await,
    };
    if let Err(e) = ensure_catalog(&state).await {
        return cached(e).await;
    }
    let headers = headers_for(&state, &session).await?;
    let client = RiotClient::new(&state.http, headers, &session.shard);
    let prefer_v3 = state.vault.lock().await.data.settings.storefront_v3;

    log::info!("store: fetching storefront (v3={prefer_v3})");
    let sf = match client.storefront(&session.puuid, prefer_v3).await {
        Ok(sf) => sf,
        Err(e) => {
            log::warn!("store: storefront failed: {e}");
            return cached(e).await;
        }
    };
    log::info!("store: storefront ok, fetching owned items");
    let owned = match owned_sets(&state, &client, &session.puuid, force).await {
        Ok(o) => o,
        Err(e) => return cached(e).await,
    };
    if let Err(e) = price_map(&state, &client).await {
        log::warn!("offers unavailable: {e}");
    }

    let store = {
        let content = state.content.lock().await;
        let vault = state.vault.lock().await;
        resolve::store(&sf, content.get()?, &owned, &vault.wishlist_set(), now())
    };
    {
        let mut vault = state.vault.lock().await;
        vault.record_store(&store, &owned);
        vault.data.cached_store = Some(store.clone());
        vault.save()?;
    }
    log::info!("store: resolved {} daily, {} bundles", store.daily.len(), store.bundles.len());
    Ok(store)
}

#[tauri::command]
pub async fn get_wallet(app: AppHandle, state: St<'_>) -> AppResult<Wallet> {
    let state = state.inner().clone();
    let cached = |e: AppError| async {
        let vault = state.vault.lock().await;
        match &vault.data.cached_wallet {
            Some(w) if is_transient(&e) => Ok(Wallet { offline: true, ..w.clone() }),
            _ => Err(e),
        }
    };
    let session = match ensure_session(&app, &state).await {
        Ok(s) => s,
        Err(e) => return cached(e).await,
    };
    let headers = match headers_for(&state, &session).await {
        Ok(h) => h,
        Err(e) => return cached(e).await,
    };
    let client = RiotClient::new(&state.http, headers, &session.shard);
    let raw = match client.wallet(&session.puuid).await {
        Ok(w) => w,
        Err(e) => return cached(e).await,
    };
    let wallet = Wallet {
        vp: raw.balances.get(crate::riot::VP_ID).copied().unwrap_or(0),
        rp: raw.balances.get(crate::riot::RP_ID).copied().unwrap_or(0),
        kc: raw.balances.get(crate::riot::KC_ID).copied().unwrap_or(0),
        fetched_at: now(),
        offline: false,
    };
    let mut vault = state.vault.lock().await;
    vault.data.cached_wallet = Some(wallet.clone());
    vault.save()?;
    Ok(wallet)
}

#[tauri::command]
pub async fn get_collection(app: AppHandle, state: St<'_>, force: Option<bool>) -> AppResult<Collection> {
    let state = state.inner().clone();
    let force = force.unwrap_or(false);

    let (owned, prices, offline) = match ensure_session(&app, &state).await {
        Ok(session) => {
            ensure_catalog(&state).await?;
            let headers = headers_for(&state, &session).await?;
            let client = RiotClient::new(&state.http, headers, &session.shard);
            match owned_sets(&state, &client, &session.puuid, force).await {
                Ok(owned) => {
                    let prices = price_map(&state, &client).await.unwrap_or_default();
                    (owned, prices, false)
                }
                Err(e) if is_transient(&e) => (cached_owned(&state).await, cached_prices(&state).await, true),
                Err(e) => return Err(e),
            }
        }
        Err(e) if is_transient(&e) => (cached_owned(&state).await, cached_prices(&state).await, true),
        Err(e) => return Err(e),
    };

    let content = state.content.lock().await;
    let collection = resolve::collection(content.get()?, &owned, &prices, owned.fetched_at, offline);
    drop(content);
    let mut vault = state.vault.lock().await;
    vault.data.cached_owned = Some(owned);
    vault.save()?;
    Ok(collection)
}

#[tauri::command]
pub async fn get_history(state: St<'_>) -> AppResult<History> {
    let state = state.inner().clone();
    let content = state.content.lock().await;
    let vault = state.vault.lock().await;
    Ok(resolve::history(&vault.data.history, content.get()?, &vault.data.install_date, now()))
}

async fn build_wishlist(state: &SharedState) -> AppResult<Wishlist> {
    let prices = cached_prices(state).await;
    let content = state.content.lock().await;
    let vault = state.vault.lock().await;
    let owned = vault.data.cached_owned.clone().unwrap_or_default();
    Ok(resolve::wishlist(
        &vault.data.wishlist,
        content.get()?,
        &owned,
        vault.data.cached_store.as_ref(),
        &vault.data.history,
        &prices,
        Utc::now().date_naive(),
    ))
}

#[tauri::command]
pub async fn wishlist_list(state: St<'_>) -> AppResult<Wishlist> {
    build_wishlist(state.inner()).await
}

#[tauri::command]
pub async fn wishlist_add(state: St<'_>, skin_uuid: String) -> AppResult<Wishlist> {
    let state = state.inner().clone();
    {
        let mut vault = state.vault.lock().await;
        if !vault.data.wishlist.iter().any(|w| w.skin_uuid == skin_uuid) {
            vault.data.wishlist.push(WishEntry { skin_uuid, added_at: now() });
            vault.sync_wishlist_flags();
            vault.save()?;
        }
    }
    build_wishlist(&state).await
}

#[tauri::command]
pub async fn wishlist_remove(state: St<'_>, skin_uuid: String) -> AppResult<Wishlist> {
    let state = state.inner().clone();
    {
        let mut vault = state.vault.lock().await;
        vault.data.wishlist.retain(|w| w.skin_uuid != skin_uuid);
        vault.sync_wishlist_flags();
        vault.save()?;
    }
    build_wishlist(&state).await
}

#[tauri::command]
pub async fn get_settings(state: St<'_>) -> AppResult<Settings> {
    Ok(state.vault.lock().await.data.settings.clone())
}

#[tauri::command]
pub async fn set_settings(app: AppHandle, state: St<'_>, settings: Settings) -> AppResult<Settings> {
    {
        let mut vault = state.vault.lock().await;
        vault.data.settings = settings.clone();
        vault.save()?;
    }
    state.close_to_tray.store(settings.close_to_tray, std::sync::atomic::Ordering::Relaxed);
    state.wake.notify_one();
    crate::platform_apply_settings(&app, &settings);
    Ok(settings)
}

#[tauri::command]
pub async fn open_skin(state: St<'_>, skin_uuid: String) -> AppResult<SkinDetail> {
    let state = state.inner().clone();
    let prices = cached_prices(&state).await;
    let content = state.content.lock().await;
    let vault = state.vault.lock().await;
    let owned = vault.data.cached_owned.clone().unwrap_or_default();
    resolve::skin_detail(content.get()?, &skin_uuid, &owned, &vault.wishlist_set(), &prices)
        .ok_or_else(|| AppError::Content("unknown skin".into()))
}

#[tauri::command]
pub async fn get_weapons(state: St<'_>) -> AppResult<Vec<Weapon>> {
    let state = state.inner().clone();
    let content = state.content.lock().await;
    let vault = state.vault.lock().await;
    let owned = vault.data.cached_owned.clone().unwrap_or_default();
    Ok(resolve::weapons(content.get()?, &owned, &vault.wishlist_set()))
}

#[tauri::command]
pub async fn get_weapon_skins(state: St<'_>, weapon_uuid: String) -> AppResult<WeaponSkins> {
    let state = state.inner().clone();
    let prices = cached_prices(&state).await;
    let content = state.content.lock().await;
    let vault = state.vault.lock().await;
    let owned = vault.data.cached_owned.clone().unwrap_or_default();
    resolve::weapon_skins(content.get()?, &weapon_uuid, &owned, &vault.wishlist_set(), &prices).ok_or_else(|| AppError::Content("unknown weapon".into()))
}

#[tauri::command]
pub async fn catalog_status(state: St<'_>) -> AppResult<CatalogStatus> {
    let state = state.inner().clone();
    let loaded = state.content.lock().await.is_loaded();
    let fetching = content::CATALOG_FETCHING.load(std::sync::atomic::Ordering::Relaxed);
    Ok(CatalogStatus {
        state: if loaded { "loaded" } else if fetching { "loading" } else { "missing" }.into(),
        progress: content::CATALOG_PROGRESS.load(std::sync::atomic::Ordering::Relaxed) as u32,
        total: content::CATALOG_FILES as u32,
    })
}

async fn probe(http: &reqwest::Client, name: &str, url: &str, expect: &[u16]) -> Check {
    let start = std::time::Instant::now();
    let res = tokio::time::timeout(std::time::Duration::from_secs(8), http.get(url).send()).await;
    let ms = start.elapsed().as_millis() as u32;
    match res {
        Ok(Ok(r)) => {
            let code = r.status().as_u16();
            Check { name: name.into(), ok: expect.is_empty() || expect.contains(&code), detail: format!("HTTP {code}"), ms }
        }
        Ok(Err(e)) => Check { name: name.into(), ok: false, detail: e.to_string(), ms },
        Err(_) => Check { name: name.into(), ok: false, detail: "timed out after 8s".into(), ms },
    }
}

#[tauri::command]
pub async fn diagnose(app: AppHandle, state: St<'_>) -> AppResult<Diagnostics> {
    let state = state.inner().clone();
    log::info!("diagnose: start");
    let http = reqwest::Client::builder().user_agent(crate::riot::USER_AGENT).connect_timeout(std::time::Duration::from_secs(8)).build()?;
    let (session, shard) = match state.auth.try_lock() {
        Ok(a) => (a.session.is_some(), a.session.as_ref().map(|s| s.shard.clone())),
        Err(_) => (false, None),
    };
    let (a, b, c) = tokio::join!(
        probe(&http, "valorant-api.com", "https://valorant-api.com/v1/version", &[200]),
        probe(&http, "media.valorant-api.com", "https://media.valorant-api.com/contenttiers/0cebb8be-46d7-c12a-d306-e9907bfc5a25/displayicon.png", &[200]),
        probe(&http, "auth.riotgames.com", "https://auth.riotgames.com/userinfo", &[401, 403]),
    );
    let mut checks = vec![a, b, c];
    if let Some(sh) = &shard {
        let name = format!("pd.{sh}.a.pvp.net");
        let url = format!("https://pd.{sh}.a.pvp.net/store/v1/offers/");
        checks.push(probe(&http, &name, &url, &[]).await);
    }
    let (loaded, fetching) = (
        state.content.try_lock().map(|c| c.is_loaded()).unwrap_or(false),
        content::CATALOG_FETCHING.load(std::sync::atomic::Ordering::Relaxed),
    );
    let (vault_open, cached_store) = match state.vault.try_lock() {
        Ok(v) => (v.is_open(), v.data.cached_store.is_some()),
        Err(_) => (false, false),
    };
    log::info!("diagnose: done");
    Ok(Diagnostics {
        data_dir: app.path().app_data_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        vault_open,
        signed_in: session,
        shard,
        catalog: CatalogStatus {
            state: if loaded { "loaded" } else if fetching { "loading" } else { "missing" }.into(),
            progress: content::CATALOG_PROGRESS.load(std::sync::atomic::Ordering::Relaxed) as u32,
            total: content::CATALOG_FILES as u32,
        },
        cached_store,
        checks,
    })
}

#[tauri::command]
pub async fn get_logs() -> AppResult<Vec<String>> {
    Ok(crate::logbuf::lines())
}

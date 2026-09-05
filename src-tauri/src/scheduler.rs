use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use chrono::{Local, NaiveTime, TimeZone, Utc};
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::background::{self, Mode, Notice};
use crate::error::AppResult;
use crate::SharedState;

static CHECKING: AtomicBool = AtomicBool::new(false);

pub fn request_check(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        run_check(&app, Mode::Daily, true).await;
    });
}

pub fn spawn_loop(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            let state = app.state::<SharedState>().inner().clone();
            let (daily, hour, minute, wishlist, bundles) = {
                let vault = state.vault.lock().await;
                let s = &vault.data.settings;
                (s.notify_daily, s.notify_hour, s.notify_minute, s.notify_wishlist, s.notify_bundles)
            };
            let rotation = !daily && (wishlist || bundles);
            let daily_wait = if daily { seconds_until_local(hour, minute) } else { u64::MAX };
            let rotation_wait = if rotation { seconds_until_rotation() } else { u64::MAX };
            let (wait, mode) = if daily_wait <= rotation_wait { (daily_wait, Mode::Daily) } else { (rotation_wait, Mode::Rotation) };
            if wait == u64::MAX {
                state.wake.notified().await;
                continue;
            }
            let fired = tokio::select! {
                _ = tokio::time::sleep(Duration::from_secs(wait)) => true,
                _ = state.wake.notified() => false,
            };
            if fired {
                run_check(&app, mode, false).await;
                tokio::time::sleep(Duration::from_secs(61)).await;
            }
        }
    });
}

pub fn seconds_until_local(hour: u8, minute: u8) -> u64 {
    let now = Local::now();
    let target_time = NaiveTime::from_hms_opt(hour as u32, minute as u32, 0).unwrap_or_else(|| NaiveTime::from_hms_opt(0, 0, 0).unwrap());
    let today = now.date_naive().and_time(target_time);
    let mut target = Local.from_local_datetime(&today).single().unwrap_or(now);
    if target <= now {
        target = target + chrono::Duration::days(1);
    }
    (target - now).num_seconds().max(1) as u64
}

pub fn seconds_until_rotation() -> u64 {
    let now = Utc::now();
    let mut target = now.date_naive().and_hms_opt(0, 2, 0).unwrap().and_utc();
    if target <= now {
        target = target + chrono::Duration::days(1);
    }
    (target - now).num_seconds().max(1) as u64
}

async fn run_check(app: &AppHandle, mode: Mode, manual: bool) {
    if CHECKING.swap(true, Ordering::SeqCst) {
        return;
    }
    let result = check(app, mode, manual).await;
    CHECKING.store(false, Ordering::SeqCst);
    match result {
        Ok(notices) => {
            for n in &notices {
                notify(app, n);
            }
            if manual && notices.is_empty() {
                notify(app, &Notice { kind: "daily".into(), title: "Shop checked".into(), body: "Nothing new for your wishlist.".into(), lines: Vec::new(), image: None });
            }
        }
        Err(e) if manual => notify(app, &Notice { kind: "daily".into(), title: "ValoStore".into(), body: format!("Could not check the shop: {e}"), lines: Vec::new(), image: None }),
        Err(e) => log::warn!("scheduled shop check failed: {e}"),
    }
}

async fn check(app: &AppHandle, mode: Mode, manual: bool) -> AppResult<Vec<Notice>> {
    let store = crate::commands::fetch_store_for_notification(app).await?;
    let state = app.state::<SharedState>().inner().clone();
    let mut vault = state.vault.lock().await;
    let mut settings = vault.data.settings.clone();
    if manual {
        settings.notify_daily = true;
        settings.notify_wishlist = true;
        settings.notify_bundles = true;
    }
    let mut seen = vault.data.seen_bundles.clone();
    let notices = background::notices(&store, &settings, &mut seen, mode);
    vault.data.seen_bundles = seen;
    vault.save()?;
    Ok(notices)
}

fn notify(app: &AppHandle, n: &Notice) {
    let body = if n.lines.is_empty() { n.body.clone() } else { n.lines.join("\n") };
    let result = app.notification().builder().title(&n.title).body(&body).show();
    if let Err(e) = result {
        log::warn!("notification failed: {e}");
    }
}

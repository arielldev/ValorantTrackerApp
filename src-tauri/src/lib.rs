mod auth;
mod background;
mod commands;
mod content;
mod error;
mod killswitch;
mod logbuf;
mod models;
mod resolve;
mod riot;
mod secrets;
mod vault;

#[cfg(desktop)]
mod desktop;
#[cfg(desktop)]
mod scheduler;
#[cfg(target_os = "android")]
mod jni_bridge;

pub use error::{AppError, AppResult};

use std::sync::atomic::AtomicBool;
use std::sync::Arc;

use tauri::Manager;
use tokio::sync::{Mutex, Notify};

pub struct AppState {
    pub auth: Mutex<auth::AuthState>,
    pub content: Mutex<content::Catalog>,
    pub vault: Mutex<vault::Vault>,
    pub kill: Mutex<Option<killswitch::Status>>,
    pub http: reqwest::Client,
    pub wake: Notify,
    pub close_to_tray: AtomicBool,
}

pub type SharedState = Arc<AppState>;

pub fn platform_apply_settings(app: &tauri::AppHandle, settings: &models::Settings) {
    #[cfg(desktop)]
    {
        use tauri_plugin_autostart::ManagerExt;
        let launcher = app.autolaunch();
        let result = if settings.autostart { launcher.enable() } else { launcher.disable() };
        if let Err(e) = result {
            log::warn!("autostart update failed: {e}");
        }
    }
    #[cfg(target_os = "android")]
    {
        use tauri_plugin_valorant_auth::ValorantAuthExt;
        let rotation = !settings.notify_daily && (settings.notify_wishlist || settings.notify_bundles);
        let result = app.valorant_auth().configure_alerts(settings.notify_daily, settings.notify_hour, settings.notify_minute, rotation);
        if let Err(e) = result {
            log::warn!("android schedule update failed: {e}");
        }
    }
    #[cfg(target_os = "ios")]
    {
        let _ = (app, settings);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    logbuf::install();
    log::info!("ValoStore starting");

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_valorant_auth::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![desktop::TRAY_ARG]),
        ));
    }

    builder = builder
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;

            let http = reqwest::Client::builder()
                .user_agent(riot::USER_AGENT)
                .timeout(std::time::Duration::from_secs(45))
                .build()?;

            let state: SharedState = Arc::new(AppState {
                auth: Mutex::new(auth::AuthState::default()),
                content: Mutex::new(content::Catalog::new(data_dir.join("catalog"))),
                vault: Mutex::new(vault::Vault::new(data_dir.join("vault.bin"))),
                kill: Mutex::new(None),
                http,
                wake: Notify::new(),
                close_to_tray: AtomicBool::new(true),
            });
            app.manage(state);

            #[cfg(desktop)]
            {
                desktop::build_tray(app.handle())?;
                scheduler::spawn_loop(app.handle().clone());
                if desktop::started_in_tray() {
                    if let Some(w) = app.get_webview_window(desktop::MAIN) {
                        let _ = w.hide();
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::session_init,
            commands::login,
            commands::logout,
            commands::get_player,
            commands::get_store,
            commands::get_wallet,
            commands::get_collection,
            commands::get_history,
            commands::wishlist_list,
            commands::wishlist_add,
            commands::wishlist_remove,
            commands::get_settings,
            commands::set_settings,
            commands::open_skin,
            commands::get_weapons,
            commands::get_weapon_skins,
            commands::catalog_status,
            commands::diagnose,
            commands::get_logs,
        ]);

    let app = builder.build(tauri::generate_context!()).expect("error while building ValoStore");

    app.run(|app, event| {
        #[cfg(desktop)]
        if let tauri::RunEvent::ExitRequested { api, code, .. } = &event {
            let state = app.state::<SharedState>();
            if code.is_none() && state.close_to_tray.load(std::sync::atomic::Ordering::Relaxed) {
                api.prevent_exit();
            }
        }
        #[cfg(not(desktop))]
        {
            let _ = (app, event);
        }
    });
}

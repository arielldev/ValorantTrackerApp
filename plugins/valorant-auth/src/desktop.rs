use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::{mpsc, Arc, Mutex};

use serde::de::DeserializeOwned;
use tauri::plugin::PluginApi;
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::models::*;
use crate::{Error, Result};

const REDIRECT_PREFIX: &str = "https://playvalorant.com/opt_in";
const LOGIN_LABEL: &str = "riot-login";

pub fn init<R: Runtime, C: DeserializeOwned>(app: &AppHandle<R>, _api: PluginApi<R, C>) -> Result<ValorantAuth<R>> {
    let dir = app.path().app_data_dir()?;
    log::warn!("valorant-auth: using INSECURE desktop fallback for secrets ({})", dir.display());
    Ok(ValorantAuth { app: app.clone(), file: dir.join("dev-secrets.json"), lock: Mutex::new(()) })
}

pub struct ValorantAuth<R: Runtime> {
    app: AppHandle<R>,
    file: PathBuf,
    lock: Mutex<()>,
}

impl<R: Runtime> ValorantAuth<R> {

    pub fn login(&self, url: &str) -> Result<LoginResult> {
        if let Some(existing) = self.app.get_webview_window(LOGIN_LABEL) {
            let _ = existing.close();
        }

        let (tx, rx) = mpsc::channel::<std::result::Result<String, Error>>();
        let nav_tx = Arc::new(Mutex::new(Some(tx.clone())));

        let window = WebviewWindowBuilder::new(&self.app, LOGIN_LABEL, WebviewUrl::External(url.parse().map_err(|e| Error::Other(format!("bad url: {e}")))?))
            .title("auth.riotgames.com — Riot Sign In")
            .inner_size(440.0, 760.0)
            .on_navigation(move |u| {
                if u.as_str().starts_with(REDIRECT_PREFIX) {
                    if let Some(tx) = nav_tx.lock().ok().and_then(|mut g| g.take()) {
                        let _ = tx.send(Ok(u.to_string()));
                    }
                    return false;
                }
                true
            })
            .build()?;

        let close_tx = tx;
        window.on_window_event(move |e| {
            if matches!(e, tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }) {
                let _ = close_tx.send(Err(Error::Cancelled));
            }
        });

        let redirect = rx.recv().map_err(|_| Error::Cancelled)?;
        let cookies = collect_cookies(&window);
        let _ = window.close();
        let redirect_url = redirect?;
        Ok(LoginResult { redirect_url, cookies })
    }

    pub fn get_secret(&self, key: &str) -> Result<Option<String>> {
        let _g = self.lock.lock().map_err(|_| Error::Other("lock".into()))?;
        Ok(self.read()?.get(key).cloned())
    }

    pub fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        let _g = self.lock.lock().map_err(|_| Error::Other("lock".into()))?;
        let mut map = self.read()?;
        map.insert(key.to_string(), value.to_string());
        self.write(&map)
    }

    pub fn clear(&self) -> Result<()> {
        let _g = self.lock.lock().map_err(|_| Error::Other("lock".into()))?;
        match std::fs::remove_file(&self.file) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.into()),
        }
    }

    fn read(&self) -> Result<BTreeMap<String, String>> {
        match std::fs::read(&self.file) {
            Ok(bytes) => Ok(serde_json::from_slice(&bytes).unwrap_or_default()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(BTreeMap::new()),
            Err(e) => Err(e.into()),
        }
    }

    fn write(&self, map: &BTreeMap<String, String>) -> Result<()> {
        if let Some(parent) = self.file.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(&self.file, serde_json::to_vec_pretty(map)?)?;
        Ok(())
    }
}

fn collect_cookies<R: Runtime>(window: &tauri::WebviewWindow<R>) -> String {
    match window.cookies_for_url("https://auth.riotgames.com".parse().unwrap()) {
        Ok(cookies) => cookies.iter().map(|c| format!("{}={}", c.name(), c.value())).collect::<Vec<_>>().join("; "),
        Err(e) => {
            log::warn!("could not read login cookies: {e}");
            String::new()
        }
    }
}

impl<R: Runtime> ValorantAuth<R> {
    pub fn configure_alerts(&self, _daily: bool, _hour: u8, _minute: u8, _rotation: bool) -> Result<()> {
        Ok(())
    }

    pub fn cancel_daily(&self) -> Result<()> {
        Ok(())
    }
}

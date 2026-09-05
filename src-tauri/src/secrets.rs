use base64::Engine;
use rand::RngCore;
use tauri::{AppHandle, Runtime};
use tauri_plugin_valorant_auth::ValorantAuthExt;

use crate::error::{AppError, AppResult};

pub const VAULT_KEY: &str = "vault_key";
pub const AUTH_COOKIES: &str = "auth_cookies";

pub async fn get<R: Runtime>(app: &AppHandle<R>, key: &str) -> AppResult<Option<String>> {
    let app = app.clone();
    let key = key.to_string();
    tauri::async_runtime::spawn_blocking(move || app.valorant_auth().get_secret(&key))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(Into::into)
}

pub async fn set<R: Runtime>(app: &AppHandle<R>, key: &str, value: &str) -> AppResult<()> {
    let app = app.clone();
    let key = key.to_string();
    let value = value.to_string();
    tauri::async_runtime::spawn_blocking(move || app.valorant_auth().set_secret(&key, &value))
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(Into::into)
}

pub async fn clear<R: Runtime>(app: &AppHandle<R>) -> AppResult<()> {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || app.valorant_auth().clear())
        .await
        .map_err(|e| AppError::Other(e.to_string()))?
        .map_err(Into::into)
}

pub async fn vault_key<R: Runtime>(app: &AppHandle<R>) -> AppResult<[u8; 32]> {
    let b64 = base64::engine::general_purpose::STANDARD;
    if let Some(existing) = get(app, VAULT_KEY).await? {
        if let Ok(bytes) = b64.decode(existing.trim()) {
            if bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&bytes);
                return Ok(key);
            }
        }
        log::warn!("stored vault key invalid; generating a new one");
    }
    let mut key = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut key);
    set(app, VAULT_KEY, &b64.encode(key)).await?;
    Ok(key)
}

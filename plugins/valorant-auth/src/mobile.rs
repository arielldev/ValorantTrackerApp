use serde::de::DeserializeOwned;
use tauri::plugin::{PluginApi, PluginHandle};
use tauri::{AppHandle, Runtime};

use crate::models::*;
use crate::{Error, Result};

const REDIRECT_PREFIX: &str = "https://playvalorant.com/opt_in";

pub fn init<R: Runtime, C: DeserializeOwned>(_app: &AppHandle<R>, api: PluginApi<R, C>) -> Result<ValorantAuth<R>> {
    let handle = api.register_android_plugin("app.valostore.auth", "ValorantAuthPlugin")?;
    Ok(ValorantAuth(handle))
}

pub struct ValorantAuth<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> ValorantAuth<R> {

    pub fn login(&self, url: &str) -> Result<LoginResult> {
        self.0
            .run_mobile_plugin("login", LoginArgs { url: url.into(), redirect_prefix: REDIRECT_PREFIX.into() })
            .map_err(|e| match e {
                tauri::plugin::mobile::PluginInvokeError::InvokeRejected(ref r) if r.message.as_deref() == Some("cancelled") => Error::Cancelled,
                other => Error::PluginInvoke(other),
            })
    }

    pub fn get_secret(&self, key: &str) -> Result<Option<String>> {
        let r: SecretResult = self.0.run_mobile_plugin("getSecret", SecretArgs { key: key.into(), value: None })?;
        Ok(r.value)
    }

    pub fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        let _: serde_json::Value =
            self.0.run_mobile_plugin("setSecret", SecretArgs { key: key.into(), value: Some(value.into()) })?;
        Ok(())
    }

    pub fn clear(&self) -> Result<()> {
        let _: serde_json::Value = self.0.run_mobile_plugin("clear", ())?;
        Ok(())
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ScheduleArgs {
    daily_enabled: bool,
    hour: u8,
    minute: u8,
    rotation_enabled: bool,
}

impl<R: Runtime> ValorantAuth<R> {
    pub fn configure_alerts(&self, daily_enabled: bool, hour: u8, minute: u8, rotation_enabled: bool) -> Result<()> {
        let _: serde_json::Value = self.0.run_mobile_plugin("scheduleDaily", ScheduleArgs { daily_enabled, hour, minute, rotation_enabled })?;
        Ok(())
    }

    pub fn cancel_daily(&self) -> Result<()> {
        let _: serde_json::Value = self.0.run_mobile_plugin("cancelDaily", ())?;
        Ok(())
    }
}

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Manager, Runtime};

mod error;
mod models;

#[cfg(target_os = "android")]
mod mobile;
#[cfg(not(target_os = "android"))]
mod desktop;

pub use error::{Error, Result};
pub use models::*;

#[cfg(target_os = "android")]
pub use mobile::ValorantAuth;
#[cfg(not(target_os = "android"))]
pub use desktop::ValorantAuth;

pub trait ValorantAuthExt<R: Runtime> {
    fn valorant_auth(&self) -> &ValorantAuth<R>;
}

impl<R: Runtime, T: Manager<R>> ValorantAuthExt<R> for T {
    fn valorant_auth(&self) -> &ValorantAuth<R> {
        self.state::<ValorantAuth<R>>().inner()
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("valorant-auth")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            let v = mobile::init(app, api)?;
            #[cfg(not(target_os = "android"))]
            let v = desktop::init(app, api)?;
            app.manage(v);
            Ok(())
        })
        .build()
}

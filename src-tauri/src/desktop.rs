use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WebviewWindowBuilder};

pub const MAIN: &str = "main";
pub const TRAY_ARG: &str = "--tray";

pub fn started_in_tray() -> bool {
    std::env::args().any(|a| a == TRAY_ARG)
}

pub fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
        return;
    }
    let Some(cfg) = app.config().app.windows.first().cloned() else { return };
    match WebviewWindowBuilder::from_config(app, &cfg) {
        Ok(b) => {
            if let Err(e) = b.build() {
                log::error!("could not recreate main window: {e}");
            }
        }
        Err(e) => log::error!("bad window config: {e}"),
    }
}

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open ValoStore", true, None::<&str>)?;
    let check = MenuItem::with_id(app, "check", "Check shop now", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &check, &PredefinedMenuItem::separator(app)?, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("ValoStore")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "check" => crate::scheduler::request_check(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }
    builder.build(app)?;
    Ok(())
}

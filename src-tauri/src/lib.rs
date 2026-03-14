mod fs;
mod git;
mod watch;

use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::Emitter;

pub struct RootPath(pub Mutex<Option<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let root = std::env::args().nth(1).map(|p| {
        std::fs::canonicalize(&p)
            .unwrap_or_else(|_| std::path::PathBuf::from(p))
            .to_string_lossy()
            .into_owned()
    });

    let root_for_watcher = root.clone();

    tauri::Builder::default()
        .manage(RootPath(Mutex::new(root)))
        .setup(move |app| {
            // Build application menu with a View -> Toggle Theme item
            let toggle = MenuItem::with_id(app, "toggle-theme", "Toggle Theme", true, Some("CmdOrCtrl+Shift+L"))?;
            let view = Submenu::with_items(app, "View", true, &[&toggle])?;
            let menu = Menu::with_items(app, &[&view])?;
            app.set_menu(menu)?;

            let app_handle = app.handle().clone();
            app.on_menu_event(move |app, event| {
                if event.id() == "toggle-theme" {
                    let _ = app.emit("toggle-theme", ());
                }
            });

            if let Some(r) = root_for_watcher {
                watch::start(r, app.handle().clone());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs::get_root, fs::read_dir, fs::read_file, fs::write_file,
            git::git_diff, git::git_show_file, git::git_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

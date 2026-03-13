mod fs;
mod git;
mod watch;

use std::sync::Mutex;

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
            if let Some(r) = root_for_watcher {
                watch::start(r, app.handle().clone());
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs::get_root, fs::read_dir, fs::read_file, fs::write_file,
            git::git_diff, git::git_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc;
use std::thread;
use tauri::{AppHandle, Emitter};

pub fn start(root: String, app: AppHandle) {
    thread::spawn(move || {
        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();

        let mut watcher = match RecommendedWatcher::new(
            move |res| { tx.send(res).ok(); },
            notify::Config::default(),
        ) {
            Ok(w) => w,
            Err(_) => return,
        };

        if watcher.watch(root.as_ref(), RecursiveMode::Recursive).is_err() {
            return;
        }

        for res in rx {
            if let Ok(event) = res {
                let paths: Vec<String> = event.paths
                    .iter()
                    .filter(|p| {
                        // Block files inside .git/ but allow .git itself (git init detection)
                        !p.to_string_lossy().contains("/.git/")
                    })
                    .map(|p| p.to_string_lossy().into_owned())
                    .collect();
                if !paths.is_empty() {
                    app.emit("file-changed", paths).ok();
                }
            }
        }
    });
}

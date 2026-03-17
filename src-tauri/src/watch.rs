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
                let mut git_changed = false;
                let paths: Vec<String> = event.paths
                    .iter()
                    .filter_map(|p| {
                        let s = p.to_string_lossy();
                        if s.contains("/.git/") {
                            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
                            if matches!(name, "index" | "HEAD" | "MERGE_HEAD" | "CHERRY_PICK_HEAD") {
                                git_changed = true;
                            }
                            None
                        } else {
                            Some(s.into_owned())
                        }
                    })
                    .collect();
                if !paths.is_empty() {
                    app.emit("file-changed", paths).ok();
                }
                if git_changed {
                    app.emit("git-changed", ()).ok();
                }
            }
        }
    });
}

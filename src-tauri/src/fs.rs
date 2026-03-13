use ignore::WalkBuilder;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct FileNode {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
pub fn get_root(state: tauri::State<crate::RootPath>) -> Option<String> {
    state.0.lock().unwrap().clone()
}

#[tauri::command]
pub fn read_dir(path: String) -> Result<Vec<FileNode>, String> {
    let root = PathBuf::from(&path);
    let mut nodes: Vec<FileNode> = WalkBuilder::new(&root)
        .max_depth(Some(1))
        .hidden(false)
        .build()
        .filter_map(|e| e.ok())
        .filter(|e| {
            let p = e.path();
            p != root && p.file_name().map(|n| n != ".git").unwrap_or(false)
        })
        .map(|e| {
            let p = e.path().to_path_buf();
            FileNode {
                name: p.file_name().unwrap_or_default().to_string_lossy().into(),
                path: p.to_string_lossy().into(),
                is_dir: p.is_dir(),
            }
        })
        .collect();

    nodes.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(nodes)
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

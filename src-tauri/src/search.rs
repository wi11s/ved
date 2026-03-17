use ignore::WalkBuilder;
use regex::Regex;
use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize)]
pub struct SearchResult {
    pub path: String,
    pub line: Option<usize>,
    pub col: Option<usize>,
    pub preview: Option<String>,
}

#[tauri::command]
pub fn search_all(root: String, query: String, limit: Option<usize>) -> Result<Vec<SearchResult>, String> {
    if query.trim().is_empty() { return Ok(vec![]); }
    let max = limit.unwrap_or(200);
    let pattern = format!(r"\b{}\b", regex::escape(&query));
    let re = Regex::new(&pattern).map_err(|e| e.to_string())?;
    let mut out: Vec<SearchResult> = Vec::new();
    let walker = WalkBuilder::new(&root)
        .hidden(false)
        .ignore(true)
        .git_ignore(true)
        .git_exclude(true)
        .build();
    for entry in walker {
        if out.len() >= max { break; }
        let entry = match entry { Ok(e) => e, Err(_) => continue };
        let p = entry.path();
        if p.is_dir() { continue; }
        if p.to_string_lossy().contains("/.git/") { continue; }
        // Filename match
        if p.file_name().and_then(|n| n.to_str()).map(|n| re.is_match(n)).unwrap_or(false) {
            out.push(SearchResult { path: p.to_string_lossy().into_owned(), line: None, col: None, preview: None });
            if out.len() >= max { break; }
        }
        // Content match
        if let Ok(content) = fs::read_to_string(p) {
            for (idx, line) in content.lines().enumerate() {
                if let Some(m) = re.find(line) {
                    let mut prev = line.trim().to_string();
                    if prev.len() > 40 { prev.truncate(40); }
                    out.push(SearchResult { path: p.to_string_lossy().into_owned(), line: Some(idx + 1), col: Some(m.start() + 1), preview: Some(prev) });
                    if out.len() >= max { break; }
                }
            }
        }
    }
    Ok(out)
}


use std::path::Path;
use std::process::Command;

fn is_git_repo(root: &str) -> bool {
    Path::new(root).join(".git").exists()
}

fn has_commits(root: &str) -> bool {
    Command::new("git")
        .args(["-C", root, "rev-parse", "HEAD"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

#[tauri::command]
pub fn git_diff(root: String, path: String, ref1: String, ref2: String) -> Result<String, String> {
    if !is_git_repo(&root) {
        return Err("not a git repository".into());
    }

    let mut cmd = Command::new("git");
    cmd.arg("-C").arg(&root).arg("diff");
    if has_commits(&root) {
        cmd.arg(&ref1);
        if ref2 != "WORKING" { cmd.arg(&ref2); }
    }
    cmd.arg("--").arg(&path);

    let output = cmd.output().map_err(|e| e.to_string())?;
    match output.status.code() {
        Some(0) | Some(1) => Ok(String::from_utf8_lossy(&output.stdout).into_owned()),
        _ => Err(String::from_utf8_lossy(&output.stderr).into_owned()),
    }
}

#[tauri::command]
pub fn git_status(root: String) -> Result<Vec<String>, String> {
    if !is_git_repo(&root) {
        return Ok(vec![]);
    }
    let output = Command::new("git")
        .args(["-C", &root, "status", "--porcelain"])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|l| l.len() > 3)
        .map(|l| {
            let rel = l[3..].trim().trim_matches('"');
            Path::new(&root).join(rel).to_string_lossy().into_owned()
        })
        .collect())
}

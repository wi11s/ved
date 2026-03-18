# VED — Versioned Editor for Diffs

A lightweight desktop app to explore, review, and lightly edit code. Great alongside terminal-first AI editors (Claude Code, Codex CLI, etc.). Read code, review diffs, make small edits — nothing more.

**Read-first.** The UI prioritizes clarity over features. AI does the heavy lifting; this is the review layer.

## Views

**Sidebar** — directory tree, dirty-state indicators, click to open

**Editor** — syntax-highlighted, inline editing, soft wrap toggle, jump to line, Cmd+S to save; no autocomplete, no LSP

**Inline diff** — single-pane editor with inline highlights (adds/deletes) vs HEAD; view changes while editing

## Usage

```sh
vse .          # open current directory
vse ~/my/repo  # open any path
```

| Action | How |
|---|---|
| Toggle theme | View → Toggle Theme (Cmd/Ctrl+Shift+L) |
| Make a small edit | Click into editor; autosaves |
| See changes inline | Adds/Deletes highlighted relative to HEAD |
| Reload from disk | Automatic; prompts only for true external edits |

## Stack

- [Tauri](https://tauri.app) — desktop shell (Rust + WebView)
- [Solid.js](https://solidjs.com) — reactive UI (~7kb, no VDOM)
- [CodeMirror](https://codemirror.net) — editor/viewer
- `git diff` — diff engine via shell
- Native OS file watcher — auto-reload on external changes

## Repo Structure

```
ide/
├── src-tauri/          # Rust backend (Tauri commands, file I/O, git, file watcher)
│   ├── src/
│   │   ├── main.rs
│   │   ├── fs.rs       # File read/write, directory tree
│   │   ├── git.rs      # git diff, log, ref listing
│   │   └── watch.rs    # File watcher
│   └── Cargo.toml
├── src/                # Frontend (Solid.js + CodeMirror)
│   ├── main.tsx
│   ├── Editor.tsx      # Unified editor with inline diff
│   ├── Sidebar.tsx     # File tree
│   └── style.css
├── CLAUDE.md
└── README.md
```

## Dev Setup

```sh
# Prerequisites: Rust, Node
npm install
npm run tauri dev
```

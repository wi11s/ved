# Companion IDE

A lightweight desktop app designed to sit alongside terminal AI editors (Claude Code, Codex CLI, etc.). Read code, review diffs, make small edits — nothing more.

**Read-first.** The UI prioritizes clarity over features. AI does the heavy lifting; this is the review layer.

## Views

**Sidebar** — directory tree, dirty-state indicators, click to open

**Editor** — syntax-highlighted, inline editing, soft wrap toggle, jump to line, Cmd+S to save; no autocomplete, no LSP

**Diff viewer** — working tree vs HEAD, or any two arbitrary refs; color-coded, view only, no merge resolution

## Usage

```sh
ide .          # open current directory
ide ~/my/repo  # open any path
```

| Action | How |
|---|---|
| View a diff | Click changed file → Diff tab |
| Switch commits | Dropdown to select any two refs |
| Make a small edit | Click into editor, type, Cmd+S |
| Reload from disk | Auto-detects external changes and prompts |

## Out of Scope

- No terminal, debugger, extensions, or plugins
- No git write operations (commit, push, branch) — view only
- No AI integration
- No remote files (local only)
- No split panes, multi-cursor, or advanced editing
- No project management or notes
- Minimal settings: light/dark mode

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
│   ├── Editor.tsx      # CodeMirror wrapper
│   ├── Diff.tsx        # Diff viewer
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

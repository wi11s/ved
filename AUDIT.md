# Code Audit Log

Each audit should review all source files for unused, redundant, or superfluous code and log findings below.

---

## Source Files

### Frontend (`src/`)
| File | Description |
|------|-------------|
| `src/main.tsx` | App root — layout, file signal, theme, event listeners |
| `src/Editor.tsx` | Editor pane — CodeMirror setup, find bar, hover popup |
| `src/Sidebar.tsx` | File tree, search mode, dirty indicators |
| `src/style.css` | All styles |
| `src/vite-env.d.ts` | Vite type shim |

### Backend (`src-tauri/src/`)
| File | Description |
|------|-------------|
| `src-tauri/src/main.rs` | Tauri entry — command registration, menu, watcher setup |
| `src-tauri/src/fs.rs` | `read_dir`, `read_file`, `write_file`, `resolve_import` |
| `src-tauri/src/git.rs` | `git_diff`, `git_show_file`, `git_status`, `git_status_detailed` |
| `src-tauri/src/search.rs` | `search_all`, `find_symbol_defs` |
| `src-tauri/src/watch.rs` | File system watcher — emits `file-changed` events |

### Config / Build
| File | Description |
|------|-------------|
| `index.html` | HTML entry |
| `vite.config.ts` | Vite config |
| `tsconfig.json` | TS config |
| `tsconfig.node.json` | TS config for Vite/Node context |
| `package.json` | JS deps and scripts |
| `src-tauri/Cargo.toml` | Rust deps |
| `src-tauri/tauri.conf.json` | Tauri app config |
| `src-tauri/build.rs` | Tauri build script |
| `src-tauri/capabilities/default.json` | Tauri capability config |

---

## Audit History

### Audit — 2026-03-16
**Reviewed by:** Claude

**Findings (all fixed):**

| Location | Issue | Action |
|----------|-------|--------|
| `git.rs` | `git_diff` — registered command never called from frontend | Deleted |
| `git.rs` | `git_status` — superseded by `git_status_detailed`; frontend never calls it | Deleted |
| `search.rs` | `find_symbol_defs`, `SearchHit`, `build_regexes` — hover popup uses `search_all` instead | Deleted |
| `fs.rs` | `resolve_import` — leftover from removed Cmd+click navigation feature | Deleted |
| `fs.rs` | `use std::path::Path` and `use std::fs as stdfs` — only used by `resolve_import` | Deleted |
| `main.rs` | `fs::resolve_import`, `git::git_diff`, `git::git_status`, `search::find_symbol_defs` in invoke_handler | Removed |
| `Editor.tsx` | `outdated`/`setOutdated` signal — set but never read in JSX | Deleted |
| `Editor.tsx` | `closeBrackets` import — imported but not added to extensions | Deleted |
| `style.css` | `.tabs`, `.tabs button`, `.tabs button.active` — tabs removed from UI | Deleted |
| `style.css` | `.reload-banner`, `.reload-banner button` — element removed from JSX | Deleted |

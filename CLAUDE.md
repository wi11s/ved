# VSE — Versioned Source Explorer

A read-first desktop app to sit alongside Claude Code / Codex CLI. Review diffs, read code, make small edits — nothing more.

See `README.md` for stack. Key constraints:

- **Solid.js** for reactivity — no other state management, no stores beyond what Solid provides
- **Rust side:** `anyhow` for errors, no `unwrap` in non-trivial paths

## Principles

- Minimal surface area. Less code = fewer bugs.
- No feature creep. If it's in "What It Does NOT Do" in `outline.md`, refuse to build it.
- Delete before adding. Audit existing code before introducing new abstractions.
- No state management beyond Solid signals/stores + Tauri commands.

## Code Rules

- Prefer deleting code over commenting it out.
- No OOP where a function works.
- No abstractions with fewer than 2 call sites.
- Errors surface to the user; no silent swallows.
## Views (only these three)

Opened via CLI (`ide <path>`), no file picker dialog.

1. **Sidebar** — file tree, dirty-state indicators
2. **Editor pane** — syntax highlight, inline edit, Cmd+S to save
3. **Diff viewer** — working tree vs HEAD, any two refs; view only

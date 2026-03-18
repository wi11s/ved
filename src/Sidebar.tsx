import { createEffect, createMemo, createResource, createSignal, For, Show, onCleanup, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";

type FileNode = { name: string; path: string; is_dir: boolean };

type Props = {
  root: string | null;
  dirtyFiles: Set<string>;
  createdFiles: Set<string>;
  removedFiles: Set<string>;
  onSelect: (path: string) => void;
  selectedPath?: string | null;
};

export function Sidebar(props: Props) {
  const [filterChanged, setFilterChanged] = createSignal(false);
  const [searchMode, setSearchMode] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searching, setSearching] = createSignal(false);
  const [results, setResults] = createSignal<Array<{ path: string; line?: number; col?: number; preview?: string }>>([]);
  const [refreshTick, setRefreshTick] = createSignal(0);
  const [reviewed, setReviewed] = createSignal<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = createSignal(false);
  const [nodes, { refetch: refetchRoot }] = createResource(
    () => props.root ?? undefined,
    (path) => invoke<FileNode[]>("read_dir", { path })
  );

  // Load persisted review state when root becomes known
  let loadedRoot: string | null = null;
  createEffect(() => {
    const root = props.root;
    if (!root || root === loadedRoot) return;
    loadedRoot = root;
    try {
      const saved = localStorage.getItem(`reviewed:${root}`);
      if (saved) setReviewed(new Set(JSON.parse(saved)));
    } catch { /* ignore corrupt data */ }
  });

  function saveReviewed(next: Set<string>) {
    if (props.root) localStorage.setItem(`reviewed:${props.root}`, JSON.stringify([...next]));
  }

  function toggleReviewed(path: string) {
    setReviewed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      saveReviewed(next);
      return next;
    });
  }

  onMount(async () => {
    const unlisten = await listen<string[]>("file-changed", (e) => {
      const changed = e.payload;
      setReviewed(prev => {
        const next = new Set(prev);
        for (const p of changed) next.delete(p);
        saveReviewed(next);
        return next;
      });
      refetchRoot();
      setRefreshTick((t) => t + 1);
    });
    onCleanup(unlisten);
  });

  const changedList = createMemo(() => {
    const set = props.dirtyFiles;
    if (!set || set.size === 0) return [] as string[];
    const arr = Array.from(set);
    // Sort by relative path for readability
    const root = props.root ?? "";
    arr.sort((a, b) => a.replace(root + "/", "").localeCompare(b.replace(root + "/", "")));
    return arr;
  });

return (
    <aside>
      <Show when={props.root} fallback={<p class="hint">Run: ide &lt;path&gt;</p>}>
        <Show when={searchMode()}>
          <ul class="search-results">
            <For each={results()}>
              {(hit) => {
                const rel = (props.root && hit.path.startsWith(props.root + "/")) ? hit.path.slice((props.root + "/").length) : hit.path;
                const title = hit.line ? `${rel}:${hit.line}` : rel;
                const isCreated = props.createdFiles.has(hit.path);
                const isRemoved = props.removedFiles.has(hit.path);
                return (
                  <li>
                    <span class="file"
                      classList={{ dirty: !isCreated && !isRemoved && props.dirtyFiles.has(hit.path), created: isCreated, removed: isRemoved }}
                      title={title}
                      onClick={async () => {
                        await emit("open-file", { path: hit.path, line: hit.line, col: hit.col || 1 });
                      }}
                    >
                      {title}
                      <Show when={hit.preview}><div class="preview">{hit.preview}</div></Show>
                    </span>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
        <Show when={!searchMode()}>
        <Show when={!filterChanged()} fallback={
          <>
            <ul>
              <For each={changedList()}>
                {(p) => {
                  const rel = (props.root && p.startsWith(props.root + "/")) ? p.slice((props.root + "/").length) : p;
                  const isCreated = props.createdFiles.has(p);
                  const isRemoved = props.removedFiles.has(p);
                  return (
                    <li class="file-row">
                      <span
                        class="file"
                        classList={{ dirty: !isCreated && !isRemoved, created: isCreated, removed: isRemoved, selected: p === props.selectedPath }}
                        onClick={() => props.onSelect(p)}
                        title={p}
                      >
                        {rel}
                      </span>
                      <button
                        type="button"
                        class="review-check"
                        classList={{ checked: reviewed().has(p) }}
                        title={reviewed().has(p) ? "Mark unreviewed" : "Mark reviewed"}
                        onClick={(e) => { e.stopPropagation(); toggleReviewed(p); }}
                      >✓</button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </>
        }>
          <ul>
            <For each={nodes() ?? []}>
              {(node) => (
                <TreeNode
                  node={node}
                  dirtyFiles={props.dirtyFiles}
                  createdFiles={props.createdFiles}
                  removedFiles={props.removedFiles}
                  refreshTick={refreshTick()}
                  onSelect={props.onSelect}
                  selectedPath={props.selectedPath}
                  reviewed={reviewed()}
                  onToggleReviewed={toggleReviewed}
                />
              )}
            </For>
          </ul>
        </Show>
        </Show>
      </Show>
      <Show when={searchMode()}>
        <div class="search-bar">
          <input
            type="text"
            placeholder="Type to search"
            class="cm-textfield"
            value={searchQuery()}
            onInput={(e) => {
              const q = (e.currentTarget as HTMLInputElement).value;
              setSearchQuery(q);
              if (!q || q.trim().length < 2) { setResults([]); return; }
              setSearching(true);
              const root = props.root!;
              invoke<Array<{ path: string; line?: number; col?: number; preview?: string }>>("search_all", { root, query: q, limit: 200 })
                .then((r) => setResults(r))
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
            }}
          />
          <div class="search-status">{searching() ? "Searching..." : results().length + " results"}</div>
        </div>
      </Show>
      <div class="sidebar-footer">
        <button
          type="button"
          class="icon"
          title="Toggle theme"
          aria-label="Toggle theme"
          onClick={() => emit("toggle-theme", {})}
        >
          {/* Moon (crescent) icon */}
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="currentColor"/>
          </svg>
        </button>
        <button
          type="button"
          classList={{ icon: true, active: searchMode() }}
          title={searchMode() ? "Close search" : "Search"}
          aria-label="Toggle search"
          onClick={() => {
            setSearchMode(prev => {
              const next = !prev;
              if (!next) { setResults([]); setSearchQuery(""); }
              return next;
            });
          }}
        >
          {/* Magnifying glass */}
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
            <line x1="16" y1="16" x2="21" y2="21" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button
          type="button"
          classList={{ icon: true, active: filterChanged() }}
          title={filterChanged() ? "Show all" : "Show changed only"}
          aria-label="Toggle changed filter"
          onClick={() => setFilterChanged(v => !v)}
        >
          {/* Sort (three lines decreasing) icon */}
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <rect x="5" y="6" width="14" height="2" fill="currentColor"/>
            <rect x="7" y="11" width="10" height="2" fill="currentColor"/>
            <rect x="9" y="16" width="6" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button
          type="button"
          class="icon"
          title="Keyboard shortcuts"
          aria-label="Keyboard shortcuts"
          onClick={() => setShowShortcuts(true)}
        >
          {/* Help / shortcuts icon */}
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" stroke-linecap="round"/>
            <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/>
          </svg>
        </button>
      </div>
      <Show when={showShortcuts()}>
        <div class="shortcuts-overlay" onClick={() => setShowShortcuts(false)} onKeyDown={e => e.key === "Escape" && setShowShortcuts(false)}>
          <div class="shortcuts-modal" onClick={e => e.stopPropagation()}>
            <div class="shortcuts-header">
              <span>Keyboard Shortcuts</span>
              <button class="shortcuts-close" onClick={() => setShowShortcuts(false)}>×</button>
            </div>
            <table class="shortcuts-table">
              <tbody>
                <tr><td><kbd>⌘</kbd><kbd>F</kbd></td><td>Open find bar</td></tr>
                <tr><td><kbd>Esc</kbd></td><td>Close find bar</td></tr>
                <tr><td><kbd>Enter</kbd></td><td>Next match</td></tr>
                <tr><td><kbd>⇧</kbd><kbd>Enter</kbd></td><td>Previous match</td></tr>
                <tr><td><kbd>⌘</kbd><kbd>D</kbd></td><td>Select next occurrence</td></tr>
                <tr><td><kbd>⌘</kbd><kbd>S</kbd></td><td>Save file</td></tr>
                <tr><td><kbd>⌘</kbd><kbd>Z</kbd> / <kbd>⌘</kbd><kbd>⇧</kbd><kbd>Z</kbd></td><td>Undo / Redo</td></tr>
                <tr><td><kbd>⌘</kbd><kbd>⇧</kbd><kbd>L</kbd></td><td>Toggle theme</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </aside>
  );
}

// A node is dirty if:
// - its exact path is in dirtyFiles (modified tracked file)
// - it's inside an untracked dir that git reports as "dir/" (trailing slash)
// - it's a directory that contains any dirty path
function isDirty(path: string, dirtyFiles: Set<string>): boolean {
  if (dirtyFiles.has(path)) return true;
  const withSlash = path + "/";
  for (const d of dirtyFiles) {
    if (d.startsWith(withSlash)) return true;       // dir contains a dirty file
    if (d.endsWith("/") && path.startsWith(d)) return true; // inside untracked dir
  }
  return false;
}

function TreeNode(props: {
  node: FileNode;
  dirtyFiles: Set<string>;
  createdFiles: Set<string>;
  removedFiles: Set<string>;
  refreshTick: number;
  onSelect: (path: string) => void;
  selectedPath?: string | null;
  reviewed: Set<string>;
  onToggleReviewed: (path: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [children] = createResource(
    () => (props.node.is_dir && open() ? `${props.node.path}:${props.refreshTick}` : undefined),
    (key) => invoke<FileNode[]>("read_dir", { path: key!.split(":")[0] })
  );

  return (
    <li class={props.node.is_dir ? undefined : "file-row"}>
      <span
        class={props.node.is_dir ? "dir" : "file"}
        classList={{
          dirty: isDirty(props.node.path, props.dirtyFiles),
          created: !props.node.is_dir && props.createdFiles.has(props.node.path),
          removed: !props.node.is_dir && props.removedFiles.has(props.node.path),
          selected: !props.node.is_dir && props.node.path === props.selectedPath,
        }}
        onClick={() => {
          if (props.node.is_dir) setOpen((o) => !o);
          else props.onSelect(props.node.path);
        }}
      >
        {props.node.is_dir ? (open() ? "▾ " : "▸ ") : "  "}
        {props.node.name}
      </span>
      <Show when={!props.node.is_dir}>
        <button
          type="button"
          class="review-check"
          classList={{ checked: props.reviewed.has(props.node.path) }}
          title={props.reviewed.has(props.node.path) ? "Mark unreviewed" : "Mark reviewed"}
          onClick={(e) => { e.stopPropagation(); props.onToggleReviewed(props.node.path); }}
        >✓</button>
      </Show>
      <Show when={open()}>
        <ul>
          <For each={children() ?? []}>
            {(child) => (
              <TreeNode
                node={child}
                dirtyFiles={props.dirtyFiles}
                createdFiles={props.createdFiles}
                removedFiles={props.removedFiles}
                refreshTick={props.refreshTick}
                onSelect={props.onSelect}
                selectedPath={props.selectedPath}
                reviewed={props.reviewed}
                onToggleReviewed={props.onToggleReviewed}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

/* @refresh reload */
import { createMemo, createResource, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import "./style.css";

function App() {
  const [root] = createResource(() => invoke<string | null>("get_root"));
  type StatusEntry = { path: string; code: string };
  const [status, { refetch: refetchStatus }] = createResource(
    () => root() ?? undefined,
    (r) => invoke<StatusEntry[]>("git_status_detailed", { root: r }).catch(() => [] as StatusEntry[])
  );
  const dirtySet = createMemo(() => new Set((status() ?? []).map(s => s.path)));
  const createdSet = createMemo(() => new Set((status() ?? []).filter(s => s.code === "??" || s.code.includes("A")).map(s => s.path)));
  const removedSet = createMemo(() => new Set((status() ?? []).filter(s => s.code.includes("D")).map(s => s.path)));

  const [file, setFile] = createSignal<string | null>(null);
  const [theme, setTheme] = createSignal<"light" | "dark">("dark");
  // Single, unified editor view — no tabs

  onMount(async () => {
    // Initialize theme from saved pref or system
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
    else setTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? "light" : "dark");
    document.documentElement.setAttribute("data-theme", theme());

    let timer: ReturnType<typeof setTimeout> | undefined;
    const triggerStatusRefetch = () => { clearTimeout(timer); timer = setTimeout(() => refetchStatus(), 300); };
    const unlisten = await listen("file-changed", triggerStatusRefetch);
    const unlistenGit = await listen("git-changed", triggerStatusRefetch);
    const unlistenToggle = await listen("toggle-theme", () => {
      setTheme((t) => (t === "light" ? "dark" : "light"));
    });
    const unlistenOpen = await listen<{ path: string; line?: number; col?: number }>("open-file", (e) => {
      const { path, line, col } = e.payload as any;
      setFile(path);
      // After the editor mounts the file, ask it to reveal the target
      setTimeout(() => { emit("reveal-pos", { path, line, col }); }, 50);
    });
    // Keyboard shortcut: CmdOrCtrl+Shift+L
    const onKey = (e: KeyboardEvent) => {
      const isAccel = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
      if (isAccel && e.shiftKey && (e.key === "L" || e.key === "l")) {
        e.preventDefault();
        setTheme((t) => (t === "light" ? "dark" : "light"));
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => { unlisten(); unlistenGit(); unlistenToggle(); unlistenOpen(); window.removeEventListener("keydown", onKey); clearTimeout(timer); });
  });

  createEffect(() => {
    const t = theme();
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  });

  createEffect(() => {
    const r = root();
    getCurrentWindow().setTitle(r ?? "VSE");
  });

  function onSelect(path: string) { setFile(path); }

  return (
    <div id="app">
      <Sidebar
        root={root() ?? null}
        dirtyFiles={dirtySet()}
        createdFiles={createdSet()}
        removedFiles={removedSet()}
        onSelect={onSelect}
        selectedPath={file()}
      />
      <div class="pane">
        <Editor file={file()} root={root() ?? null} />
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);

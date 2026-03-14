/* @refresh reload */
import { createMemo, createResource, createSignal, createEffect, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import "./style.css";

function App() {
  const [root] = createResource(() => invoke<string | null>("get_root"));
  const [dirty, { refetch: refetchDirty }] = createResource(
    () => root() ?? undefined,
    (r) => invoke<string[]>("git_status", { root: r }).catch(() => [] as string[])
  );
  const dirtySet = createMemo(() => new Set(dirty() ?? []));

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
    const unlisten = await listen("file-changed", () => {
      clearTimeout(timer);
      timer = setTimeout(() => refetchDirty(), 300);
    });
    const unlistenToggle = await listen("toggle-theme", () => {
      setTheme((t) => (t === "light" ? "dark" : "light"));
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
    onCleanup(() => { unlisten(); unlistenToggle(); window.removeEventListener("keydown", onKey); clearTimeout(timer); });
  });

  createEffect(() => {
    const t = theme();
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("theme", t);
  });

  function onSelect(path: string) { setFile(path); }

  return (
    <div id="app">
      <Sidebar root={root() ?? null} dirtyFiles={dirtySet()} onSelect={onSelect} selectedPath={file()} />
      <div class="pane">
        <Editor file={file()} root={root() ?? null} />
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);

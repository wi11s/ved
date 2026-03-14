/* @refresh reload */
import { createMemo, createResource, createSignal, onCleanup, onMount } from "solid-js";
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
  // Single, unified editor view — no tabs

  onMount(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = await listen("file-changed", () => {
      clearTimeout(timer);
      timer = setTimeout(() => refetchDirty(), 300);
    });
    onCleanup(() => { unlisten(); clearTimeout(timer); });
  });

  function onSelect(path: string) { setFile(path); }

  return (
    <div id="app">
      <Sidebar root={root() ?? null} dirtyFiles={dirtySet()} onSelect={onSelect} />
      <div class="pane">
        <Editor file={file()} root={root() ?? null} />
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);

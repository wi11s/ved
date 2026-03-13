/* @refresh reload */
import { createMemo, createResource, createSignal, onCleanup, onMount } from "solid-js";
import { render } from "solid-js/web";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import { Diff } from "./Diff";
import "./style.css";

function App() {
  const [root] = createResource(() => invoke<string | null>("get_root"));
  const [dirty, { refetch: refetchDirty }] = createResource(
    () => root() ?? undefined,
    (r) => invoke<string[]>("git_status", { root: r }).catch(() => [] as string[])
  );
  const dirtySet = createMemo(() => new Set(dirty() ?? []));

  const [file, setFile] = createSignal<string | null>(null);
  const [tab, setTab] = createSignal<"editor" | "diff">("editor");

  onMount(async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = await listen("file-changed", () => {
      clearTimeout(timer);
      timer = setTimeout(() => refetchDirty(), 300);
    });
    onCleanup(() => { unlisten(); clearTimeout(timer); });
  });

  function onSelect(path: string) {
    setFile(path);
    setTab(dirtySet().has(path) ? "diff" : "editor");
  }

  return (
    <div id="app">
      <Sidebar root={root() ?? null} dirtyFiles={dirtySet()} onSelect={onSelect} />
      <div class="pane">
        <div class="tabs">
          <button classList={{ active: tab() === "editor" }} onClick={() => setTab("editor")}>Editor</button>
          <button classList={{ active: tab() === "diff" }} onClick={() => setTab("diff")}>Diff</button>
        </div>
        <div classList={{ hidden: tab() !== "editor" }}><Editor file={file()} /></div>
        <div classList={{ hidden: tab() !== "diff" }}><Diff file={file()} root={root() ?? null} /></div>
      </div>
    </div>
  );
}

render(() => <App />, document.getElementById("root") as HTMLElement);

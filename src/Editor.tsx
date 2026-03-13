import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { EditorView, minimalSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { LanguageDescription } from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export function Editor(props: { file: string | null }) {
  let container!: HTMLDivElement;
  let view: EditorView | undefined;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const [outdated, setOutdated] = createSignal(false);
  const [reloadTick, setReloadTick] = createSignal(0);

  onMount(async () => {
    const unlisten = await listen<string[]>("file-changed", (event) => {
      if (props.file && event.payload.includes(props.file)) setOutdated(true);
    });
    onCleanup(unlisten);
  });

  createEffect(() => {
    const file = props.file;
    const _tick = reloadTick();
    if (!file) {
      view?.destroy();
      view = undefined;
      return;
    }

    setOutdated(false);
    let stale = false;
    onCleanup(() => { stale = true; clearTimeout(saveTimer); });

    (async () => {
      const content = await invoke<string>("read_file", { path: file });
      if (stale) return;

      const langDesc = LanguageDescription.matchFilename(languages, file);
      const langExt = langDesc ? (await langDesc.load()).extension : [];
      if (stale) return;

      view?.destroy();
      view = new EditorView({
        state: EditorState.create({
          doc: content,
          extensions: [
            minimalSetup,
            langExt,
            EditorView.lineWrapping,
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;
              clearTimeout(saveTimer);
              saveTimer = setTimeout(() => {
                invoke("write_file", { path: file, content: update.state.doc.toString() });
              }, 500);
            }),
          ],
        }),
        parent: container,
      });
    })();
  });

  onCleanup(() => { view?.destroy(); clearTimeout(saveTimer); });

  return (
    <div class="editor-wrap">
      <Show when={outdated()}>
        <div class="reload-banner">
          File changed externally.{" "}
          <button onClick={() => setReloadTick((t) => t + 1)}>Reload</button>
        </div>
      </Show>
      <div ref={container} class="editor" />
    </div>
  );
}

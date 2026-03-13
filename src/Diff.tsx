import { createResource, For, Show, onCleanup, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Props = { file: string | null; root: string | null };

export function Diff(props: Props) {
  const [diff, { refetch }] = createResource(
    () => (props.root && props.file ? { root: props.root, path: props.file } : undefined),
    ({ root, path }) =>
      invoke<string>("git_diff", { root, path, ref1: "HEAD", ref2: "WORKING" })
        .catch(() => null as string | null)
  );

  onMount(async () => {
    const unlisten = await listen("file-changed", () => refetch());
    onCleanup(unlisten);
  });

  return (
    <div class="diff-pane">
      <Show when={props.file} fallback={<p class="hint">Select a file to view diff</p>}>
        <div class="diff-content">
          {(() => {
            if (diff.loading) return <p class="hint">Loading…</p>;
            const d = diff();
            if (d === null || d === undefined) return <p class="hint">Not a git repository</p>;
            if (d === "") return <p class="hint">No changes</p>;
            return <DiffLines raw={d} />;
          })()}
        </div>
      </Show>
    </div>
  );
}

function DiffLines(props: { raw: string }) {
  const lines = () =>
    props.raw
      .split("\n")
      .filter((l) => !l.startsWith("diff ") && !l.startsWith("index ") && !l.startsWith("\\ "));

  return (
    <pre class="diff">
      <For each={lines()}>
        {(line) => (
          <div
            class={
              line.startsWith("+") && !line.startsWith("+++") ? "add"
              : line.startsWith("-") && !line.startsWith("---") ? "del"
              : line.startsWith("@@") ? "hunk"
              : "ctx"
            }
          >
            {line || " "}
          </div>
        )}
      </For>
    </pre>
  );
}

import { createResource, createSignal, For, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

type FileNode = { name: string; path: string; is_dir: boolean };

type Props = {
  root: string | null;
  dirtyFiles: Set<string>;
  onSelect: (path: string) => void;
  selectedPath?: string | null;
};

export function Sidebar(props: Props) {
  const [nodes] = createResource(
    () => props.root ?? undefined,
    (path) => invoke<FileNode[]>("read_dir", { path })
  );

  return (
    <aside>
      <Show when={props.root} fallback={<p class="hint">Run: ide &lt;path&gt;</p>}>
        <ul>
          <For each={nodes() ?? []}>
            {(node) => (
              <TreeNode node={node} dirtyFiles={props.dirtyFiles} onSelect={props.onSelect} selectedPath={props.selectedPath} />
            )}
          </For>
        </ul>
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
  onSelect: (path: string) => void;
  selectedPath?: string | null;
}) {
  const [open, setOpen] = createSignal(false);
  const [children] = createResource(
    () => (props.node.is_dir && open() ? props.node.path : undefined),
    (path) => invoke<FileNode[]>("read_dir", { path })
  );

  return (
    <li>
      <span
        class={props.node.is_dir ? "dir" : "file"}
        classList={{
          dirty: isDirty(props.node.path, props.dirtyFiles),
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
      <Show when={open()}>
        <ul>
          <For each={children() ?? []}>
            {(child) => (
              <TreeNode node={child} dirtyFiles={props.dirtyFiles} onSelect={props.onSelect} selectedPath={props.selectedPath} />
            )}
          </For>
        </ul>
      </Show>
    </li>
  );
}

// The open board is reflected in the URL hash so a board can be bookmarked
// and reopened directly.
//
// The hash cannot hold the file's path: the File System Access API never
// exposes one, and a page cannot turn a path into a handle even if it had it —
// opening a local file always requires either the picker or a handle the
// browser already stored for this origin. So the hash carries a reference to
// the handle kept in IndexedDB (see recentFiles.ts): `#<id>-<file name>`, e.g.
// `#3-kanban.md`. The id does the resolving; the name keeps bookmarks legible
// and gives a fallback when the id is gone (cleared storage, another profile).

export interface BoardRef {
  id: number | null;
  name: string | null;
}

export function boardHash(id: number, name: string): string {
  return `#${id}-${encodeURIComponent(name)}`;
}

/** null when the hash references no board (empty, or an unrecognized shape). */
export function parseBoardHash(hash: string): BoardRef | null {
  const raw = hash.replace(/^#/, "");
  if (raw === "") return null;
  const match = /^(\d+)-(.*)$/.exec(raw);
  if (!match) {
    // A bare name still identifies a board well enough to try.
    return { id: null, name: safeDecode(raw) };
  }
  return { id: Number(match[1]), name: safeDecode(match[2]) || null };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

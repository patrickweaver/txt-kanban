import type { SaveStatus } from "./types";

async function writeToHandle(
  handle: FileSystemFileHandle,
  text: string,
): Promise<void> {
  if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") {
      throw new Error("Write permission denied");
    }
  }
  // createWritable stages into a swap file that atomically replaces the
  // target on close(); a missed close() would save nothing.
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export interface FileWriter {
  save(text: string): void;
  /** True while a write is in flight or queued. */
  isBusy(): boolean;
}

/**
 * Serializes writes to a file handle. Saves requested while a write is in
 * flight collapse to the newest text (latest wins) — intermediate versions
 * are never written.
 */
export function createFileWriter(
  handle: FileSystemFileHandle,
  onStatus: (status: SaveStatus) => void
): FileWriter {
  let pending: string | null = null;
  let writing = false;

  async function drain(): Promise<void> {
    writing = true;
    onStatus("saving");
    try {
      while (pending !== null) {
        const text = pending;
        pending = null;
        await writeToHandle(handle, text);
      }
      onStatus("saved");
    } catch {
      onStatus("error");
    } finally {
      writing = false;
    }
  }

  return {
    save(text: string) {
      pending = text;
      if (!writing) void drain();
    },
    isBusy: () => writing || pending !== null,
  };
}

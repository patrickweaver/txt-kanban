// Recently opened kanban files. Real file paths are not exposed to the web
// and FileSystemFileHandles are not storable in localStorage, but they ARE
// structured-cloneable into IndexedDB, and a stored handle can reopen its
// file later (after a permission re-prompt) without the picker.
// All functions are best-effort and never throw: recents are a convenience,
// and failure to record one must not break opening a file.

export interface RecentFile {
  id: number;
  name: string;
  /** Board title at last open, for display. */
  title: string | null;
  lastOpened: number;
  handle: FileSystemFileHandle;
}

// Predates the rename to Cranban. Renaming it would orphan every stored
// handle — losing recents and breaking the `#<id>-<name>` links that resolve
// against them — so the old name stays.
const DB_NAME = "kanban-txt";
const STORE = "recent-files";
const MAX_RECENTS = 8;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listRecentFiles(): Promise<RecentFile[]> {
  try {
    const db = await openDb();
    try {
      const store = db.transaction(STORE, "readonly").objectStore(STORE);
      const all = await asPromise(store.getAll() as IDBRequest<RecentFile[]>);
      return all.sort((a, b) => b.lastOpened - a.lastOpened);
    } finally {
      db.close();
    }
  } catch {
    return [];
  }
}

/** One stored recent by id; null when missing or unreadable. */
export async function getRecentFile(id: number): Promise<RecentFile | null> {
  try {
    const db = await openDb();
    try {
      const store = db.transaction(STORE, "readonly").objectStore(STORE);
      return (await asPromise(store.get(id) as IDBRequest<RecentFile | undefined>)) ?? null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

/** Records the file and returns its stable recents id (null if unstorable). */
export async function rememberFile(
  handle: FileSystemFileHandle,
  title: string | null
): Promise<number | null> {
  try {
    const db = await openDb();
    try {
      // Read existing entries first: isSameEntry is async and would close an
      // open transaction, so dedupe before starting the write transaction.
      const readStore = db.transaction(STORE, "readonly").objectStore(STORE);
      const all = await asPromise(readStore.getAll() as IDBRequest<RecentFile[]>);
      let existingId: number | undefined;
      for (const entry of all) {
        try {
          if (await handle.isSameEntry(entry.handle)) {
            existingId = entry.id;
            break;
          }
        } catch {
          // Unreadable stored handle; leave it for the failure path to prune.
        }
      }

      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const record = { name: handle.name, title, lastOpened: Date.now(), handle };
      let id = existingId ?? null;
      if (existingId !== undefined) {
        store.put({ ...record, id: existingId });
      } else {
        // Read the generated key from the event rather than awaiting it, so no
        // await lands inside the transaction and risks auto-closing it.
        const request = store.put(record);
        request.onsuccess = () => {
          id = Number(request.result);
        };
        const oldestFirst = [...all].sort((a, b) => a.lastOpened - b.lastOpened);
        for (const entry of oldestFirst.slice(0, Math.max(0, all.length + 1 - MAX_RECENTS))) {
          store.delete(entry.id);
        }
      }
      await txDone(tx);
      return id;
    } finally {
      db.close();
    }
  } catch {
    // Best-effort only.
    return null;
  }
}

export async function forgetFile(id: number): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      await txDone(tx);
    } finally {
      db.close();
    }
  } catch {
    // Best-effort only.
  }
}

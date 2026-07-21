import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Board, SaveStatus } from "./types";
import { parseBoard } from "./parser";
import { serializeBoard } from "./serializer";
import { createFileWriter } from "./fileWriter";
import type { FileWriter } from "./fileWriter";
import { THEME_SETTING, readSetting, restoreCard, writeSetting } from "./boardOps";
import { forgetFile, listRecentFiles, rememberFile } from "./recentFiles";
import type { RecentFile } from "./recentFiles";
import { useBoard } from "./useBoard";
import {
  DEFAULT_THEME,
  THEMES,
  readStoredTheme,
  resolveThemeId,
  writeStoredTheme,
} from "./themes";
import type { ThemeId } from "./themes";
import BoardView from "./components/BoardView";
import ArchiveView from "./components/ArchiveView";

function relativeTime(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Clock time of a save, including seconds so quick successive saves visibly tick.
function savedClockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const supportsFilePicker = "showOpenFilePicker" in window;

interface ThemePickerProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}

function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <label className="theme-picker">
      <span>Theme</span>
      <select value={theme} onChange={(e) => onChange(e.target.value as ThemeId)}>
        {THEMES.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

function App() {
  const { board, boardRef, load, apply, restore } = useBoard();
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [writer, setWriter] = useState<FileWriter | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [recents, setRecents] = useState<RecentFile[]>([]);
  const [view, setView] = useState<"board" | "archive">("board");
  // Mirrors the file's `Theme` setting once a board is open; before that (and
  // for files that set no theme) it is the browser-local default.
  const [theme, setTheme] = useState<ThemeId>(() => readStoredTheme() ?? DEFAULT_THEME);
  // The file text this app last loaded or wrote; polling compares against it
  // so our own saves are not mistaken for external edits.
  const lastTextRef = useRef<string | null>(null);

  const readOnly = board !== null && writer === null;

  useEffect(() => {
    if (supportsFilePicker) void listRecentFiles().then(setRecents);
  }, []);

  // The theme is a document-level concern (page background, form controls), so
  // it lives on the root element rather than on the app subtree.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // The File System Access API has no change events, so poll the handle and
  // reload the board when the file is edited externally (e.g. a text editor).
  useEffect(() => {
    if (!fileHandle) return;
    let lastModified = 0;
    let checking = false;
    const id = setInterval(async () => {
      if (checking) return;
      // Skip while our own writes are queued; the file on disk lags the app.
      if (writer?.isBusy()) return;
      // Defer while the user is typing in an inline editor; a reload would
      // discard their in-progress edit.
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      checking = true;
      try {
        const file = await fileHandle.getFile();
        if (file.lastModified !== lastModified) {
          const text = await file.text();
          // A save may have started while we were reading; its content will
          // land shortly, so don't treat the stale read as an external edit.
          if (writer?.isBusy()) return;
          lastModified = file.lastModified;
          if (text !== lastTextRef.current) {
            lastTextRef.current = text;
            const parsed = parseBoard(text);
            load(parsed);
            // An externally edited Theme setting applies immediately.
            const fromFile = resolveThemeId(readSetting(parsed, THEME_SETTING) ?? "");
            if (fromFile) setTheme(fromFile);
          }
        }
      } catch {
        // File temporarily unreadable (e.g. mid-save in the editor); retry
        // on the next tick.
      } finally {
        checking = false;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [fileHandle, writer, load]);

  async function openHandle(handle: FileSystemFileHandle): Promise<void> {
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = parseBoard(text);
    setWriter(
      createFileWriter(handle, (status) => {
        setSaveStatus(status);
        if (status === "saved") setSavedAt(Date.now());
      })
    );
    setFileHandle(handle);
    setFileName(handle.name);
    setSaveStatus("idle");
    setSavedAt(null);
    setOpenError(null);
    setView("board");
    lastTextRef.current = text;
    load(parsed);
    // A file without a Theme setting keeps whatever is already selected,
    // rather than resetting the user's choice.
    const fromFile = resolveThemeId(readSetting(parsed, THEME_SETTING) ?? "");
    if (fromFile) setTheme(fromFile);
    void rememberFile(handle, parsed.title).then(listRecentFiles).then(setRecents);
  }

  async function openFile(): Promise<void> {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: "Kanban text",
            accept: { "text/plain": [".txt"], "text/markdown": [".md"] },
          },
        ],
      });
      await openHandle(handle);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setOpenError(`Could not open file: ${String(error)}`);
    }
  }

  async function openRecent(recent: RecentFile): Promise<void> {
    try {
      const handle = recent.handle;
      if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
        if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") {
          setOpenError(`Permission to open ${recent.name} was denied`);
          return;
        }
      }
      await openHandle(handle);
    } catch (error) {
      // Most likely moved or deleted since it was stored; drop it.
      void forgetFile(recent.id).then(listRecentFiles).then(setRecents);
      setOpenError(`Could not open ${recent.name}: ${String(error)}`);
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setWriter(null);
    setFileHandle(null);
    setFileName(file.name);
    setSaveStatus("idle");
    setOpenError(null);
    lastTextRef.current = text;
    const parsed = parseBoard(text);
    load(parsed);
    const fromFile = resolveThemeId(readSetting(parsed, THEME_SETTING) ?? "");
    if (fromFile) setTheme(fromFile);
  }

  /**
   * Applies the theme. With a board open it goes to that file's Settings
   * section (read-only boards update in memory only, since save is a no-op
   * without a writer); on the start screen it sets this browser's default for
   * boards whose file specifies no theme.
   */
  function changeTheme(next: ThemeId): void {
    setTheme(next);
    if (boardRef.current) save(apply((b) => writeSetting(b, THEME_SETTING, next)));
    else writeStoredTheme(next);
  }

  function save(next: Board): void {
    if (!writer) return;
    const text = serializeBoard(next);
    lastTextRef.current = text;
    writer.save(text);
  }

  function retrySave(): void {
    const current = boardRef.current;
    if (current) save(current);
  }

  if (board === null) {
    return (
      <section id="center">
        <h1>Kanban</h1>
        {openError && <p className="open-error">{openError}</p>}
        {supportsFilePicker ? (
          <>
            <button className="open-button" onClick={openFile}>
              Open kanban file
            </button>
            {recents.length > 0 && (
              <div className="recent-files">
                <h2>Recent files</h2>
                <ul>
                  {recents.map((recent) => (
                    <li key={recent.id}>
                      <button className="recent-file" onClick={() => openRecent(recent)}>
                        <span className="recent-name">{recent.name}</span>
                        {recent.title && <span className="recent-title">{recent.title}</span>}
                        <span className="recent-time">{relativeTime(recent.lastOpened)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <label htmlFor="file-input">Select Kanban file</label>
            <input
              id="file-input"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleFileSelect}
            />
          </>
        )}
        <ThemePicker theme={theme} onChange={changeTheme} />
      </section>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="board-title">{board.title ?? "Kanban"}</h1>
        <span className="file-name">{fileName}</span>
        <nav className="tabs">
          <button
            className={`tab${view === "board" ? " tab-active" : ""}`}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            className={`tab${view === "archive" ? " tab-active" : ""}`}
            onClick={() => setView("archive")}
          >
            Archive
          </button>
        </nav>
        <ThemePicker theme={theme} onChange={changeTheme} />
        {readOnly ? (
          <span className="save-status">
            Read-only — editing and saving require Chrome or Edge
          </span>
        ) : (
          <span
            className={`save-status save-status-${saveStatus}`}
            title="Your edits are written straight back to the .txt file on disk. This shows whether the latest change has been saved."
          >
            {saveStatus === "idle" && "Auto-saves to file"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" &&
              (savedAt ? `Saved to file at ${savedClockTime(savedAt)}` : "Saved to file")}
            {saveStatus === "error" && (
              <>
                Error saving <button onClick={retrySave}>Retry</button>
              </>
            )}
          </span>
        )}
      </header>
      {view === "archive" ? (
        <ArchiveView
          board={board}
          readOnly={readOnly}
          onRestore={(cardId) => save(apply((b) => restoreCard(b, cardId)))}
        />
      ) : (
        <BoardView
          board={board}
          readOnly={readOnly}
          apply={apply}
          restore={restore}
          save={save}
        />
      )}
    </main>
  );
}

export default App;

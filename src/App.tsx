import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Board, SaveStatus } from "./types";
import { parseBoard } from "./parser";
import { serializeBoard } from "./serializer";
import { createFileWriter } from "./fileWriter";
import type { FileWriter } from "./fileWriter";
import {
  THEME_SETTING,
  readSetting,
  restoreCard,
  writeSetting,
} from "./boardOps";
import {
  forgetFile,
  getRecentFile,
  listRecentFiles,
  rememberFile,
} from "./recentFiles";
import type { RecentFile } from "./recentFiles";
import { DEMO_HASH, boardHash, parseBoardHash } from "./boardUrl";
import type { BoardRef } from "./boardUrl";
import {
  DEMO_BANNER,
  HUMAN_INTRO,
  STARTER_FILE_NAME,
  demoBoardText,
  starterBoardText,
} from "./starterBoard";
import { readStoredDemo, writeStoredDemo } from "./demoStore";
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

// The intro copy is also written into the file, so it carries markdown
// backticks. Inline code is the only span markup it uses; an unpaired backtick
// falls through as literal text.
function withInlineCode(text: string) {
  return text
    .split(/`([^`]+)`/)
    .map((part, i) => (i % 2 === 0 ? part : <code key={i}>{part}</code>));
}

const supportsFilePicker = "showOpenFilePicker" in window;

// The favicon, reused as the wordmark next to both headings. It lives in
// public/, so it needs BASE_URL to survive a build served from a subdirectory.
// Decorative: the heading beside it already carries the name, so alt is empty.
function TitleIcon() {
  return (
    <img
      className="title-icon"
      src={`${import.meta.env.BASE_URL}icon.png`}
      alt=""
    />
  );
}

interface ThemePickerProps {
  theme: ThemeId;
  onChange: (theme: ThemeId) => void;
}

function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <label className="theme-picker">
      <span>Theme</span>
      <select
        value={theme}
        onChange={(e) => onChange(e.target.value as ThemeId)}
      >
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
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null,
  );
  const [recents, setRecents] = useState<RecentFile[]>([]);
  const [view, setView] = useState<"board" | "archive">("board");
  // A board named by the URL that needs a click before the browser will grant
  // file permission (permission does not survive a page load on its own).
  const [pendingBoard, setPendingBoard] = useState<RecentFile | null>(null);
  // The demo board: a real, editable board with no file behind it.
  const [demo, setDemo] = useState(false);
  // Mirrors the file's `Theme` setting once a board is open; before that (and
  // for files that set no theme) it is the browser-local default.
  const [theme, setTheme] = useState<ThemeId>(
    () => readStoredTheme() ?? DEFAULT_THEME,
  );
  // The file text this app last loaded or wrote; polling compares against it
  // so our own saves are not mistaken for external edits.
  const lastTextRef = useRef<string | null>(null);
  // The hash this app set itself, so its own hashchange events are ignored.
  const ownHashRef = useRef<string>("");

  // No writer means nothing can be written to disk — except on the demo board,
  // which is fully editable and saves to localStorage instead.
  const readOnly = board !== null && writer === null && !demo;

  useEffect(() => {
    if (supportsFilePicker) void listRecentFiles().then(setRecents);
  }, []);

  // Open whatever board the URL names, and keep following the URL as the user
  // navigates back and forward.
  useEffect(() => {
    if (location.hash === DEMO_HASH) {
      ownHashRef.current = DEMO_HASH;
      openDemo();
    } else if (supportsFilePicker) {
      const initial = parseBoardHash(location.hash);
      if (initial) {
        ownHashRef.current = location.hash;
        void openFromUrl(initial);
      }
    }
    function onHashChange(): void {
      if (location.hash === ownHashRef.current) return;
      ownHashRef.current = location.hash;
      if (location.hash === DEMO_HASH) {
        openDemo();
        return;
      }
      // A file board can only be resolved where handles are stored at all.
      const ref = supportsFilePicker ? parseBoardHash(location.hash) : null;
      if (ref) void openFromUrl(ref);
      else closeBoard();
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            const fromFile = resolveThemeId(
              readSetting(parsed, THEME_SETTING) ?? "",
            );
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
    const original = await file.text();
    // An empty file has nothing to lose, so seed it with the starter board
    // rather than dropping the user on a blank screen. Only whitespace counts
    // as empty: a file we merely failed to parse keeps its contents.
    const seeding = original.trim() === "";
    const text = seeding ? starterBoardText() : original;
    const parsed = parseBoard(text);
    const nextWriter = createFileWriter(handle, (status) => {
      setSaveStatus(status);
      if (status === "saved") setSavedAt(Date.now());
    });
    setWriter(nextWriter);
    if (seeding) nextWriter.save(text);
    setFileHandle(handle);
    setFileName(handle.name);
    setSaveStatus("idle");
    setSavedAt(null);
    setOpenError(null);
    setView("board");
    setPendingBoard(null);
    lastTextRef.current = text;
    load(parsed);
    // A file without a Theme setting keeps whatever is already selected,
    // rather than resetting the user's choice.
    const fromFile = resolveThemeId(readSetting(parsed, THEME_SETTING) ?? "");
    if (fromFile) setTheme(fromFile);
    void rememberFile(handle, parsed.title).then((id) => {
      // Point the URL at this board once it has a stable recents id.
      if (id !== null) {
        ownHashRef.current = boardHash(id, handle.name);
        if (location.hash !== ownHashRef.current)
          location.hash = ownHashRef.current;
      }
      return listRecentFiles().then(setRecents);
    });
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
        if (
          (await handle.requestPermission({ mode: "readwrite" })) !== "granted"
        ) {
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

  /** Resolves a URL board reference to a stored handle: by id, else by name. */
  async function findBoard(ref: BoardRef): Promise<RecentFile | null> {
    if (ref.id !== null) {
      const byId = await getRecentFile(ref.id);
      if (byId) return byId;
    }
    if (!ref.name) return null;
    // Ids are per-browser, so fall back to the name for links opened elsewhere.
    return (
      (await listRecentFiles()).find((entry) => entry.name === ref.name) ?? null
    );
  }

  /**
   * Opens the board a URL points at. File permission does not survive a page
   * load, so unless the browser still grants it we surface a button instead:
   * re-requesting permission requires a user gesture.
   */
  async function openFromUrl(ref: BoardRef): Promise<void> {
    const recent = await findBoard(ref);
    if (!recent) {
      // The URL names the board on screen, so stop showing the old one rather
      // than leaving the address bar contradicting the board (and hiding the
      // message, which only the start screen renders). Nothing is lost: edits
      // are already on disk and recents reopen in a click.
      closeBoard();
      setOpenError(
        `No board in this browser matches ${ref.name ?? "that link"}. Open the file once to link it.`,
      );
      return;
    }
    let granted: boolean;
    try {
      granted =
        (await recent.handle.queryPermission({ mode: "readwrite" })) ===
        "granted";
    } catch {
      granted = false;
    }
    if (granted) {
      await openHandle(recent.handle);
      return;
    }
    closeBoard();
    setPendingBoard(recent);
  }

  /** Grants permission for the URL's board from a click, then opens it. */
  async function openPendingBoard(): Promise<void> {
    if (!pendingBoard) return;
    try {
      if (
        (await pendingBoard.handle.requestPermission({ mode: "readwrite" })) !==
        "granted"
      ) {
        setOpenError(`Permission to open ${pendingBoard.name} was denied`);
        return;
      }
      await openHandle(pendingBoard.handle);
    } catch (error) {
      setOpenError(`Could not open ${pendingBoard.name}: ${String(error)}`);
    }
  }

  /**
   * Opens the demo board: a normal board with no file behind it. Its text is
   * kept in localStorage, so edits survive a refresh, and the URL carries the
   * reserved demo hash so a reload lands back here rather than on the start
   * screen. Previous edits are reopened as they were left.
   */
  function openDemo(): void {
    const text = readStoredDemo() ?? demoBoardText();
    const parsed = parseBoard(text);
    setWriter(null);
    setFileHandle(null);
    setFileName(null);
    setSaveStatus("idle");
    setSavedAt(null);
    setOpenError(null);
    setPendingBoard(null);
    setView("board");
    setDemo(true);
    lastTextRef.current = text;
    // Store it now, so a refresh before the first edit still reopens this demo.
    writeStoredDemo(text);
    load(parsed);
    const fromFile = resolveThemeId(readSetting(parsed, THEME_SETTING) ?? "");
    if (fromFile) setTheme(fromFile);
    ownHashRef.current = DEMO_HASH;
    // Assignment pushes a history entry, so Back leaves the demo.
    if (location.hash !== DEMO_HASH) location.hash = DEMO_HASH;
  }

  function closeBoard(): void {
    setWriter(null);
    setFileHandle(null);
    setFileName(null);
    setSaveStatus("idle");
    setSavedAt(null);
    setOpenError(null);
    setPendingBoard(null);
    setDemo(false);
    setView("board");
    lastTextRef.current = null;
    load(null);
    void listRecentFiles().then(setRecents);
  }

  function downloadText(text: string): void {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = STARTER_FILE_NAME;
    link.click();
    // Revoking in the same tick can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /** Offers the starter board as a file, so a new user has something to open. */
  function downloadStarter(): void {
    downloadText(starterBoardText());
  }

  /**
   * Offers the board on screen as a file. This is how work done in the demo
   * leaves the browser: open the downloaded file and it becomes a real board.
   */
  function downloadBoard(): void {
    const current = boardRef.current;
    if (current) downloadText(serializeBoard(current));
  }

  /** Back to the picker at the root URL; the file stays in recents. */
  function switchBoards(): void {
    ownHashRef.current = "";
    // pushState leaves a history entry, so Back returns to the board.
    history.pushState(null, "", location.pathname + location.search);
    closeBoard();
  }

  async function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
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
    if (boardRef.current)
      save(apply((b) => writeSetting(b, THEME_SETTING, next)));
    else writeStoredTheme(next);
  }

  function save(next: Board): void {
    // The demo has no file: its text goes to this browser's storage instead, so
    // edits survive a refresh without ever being written to disk.
    if (demo) {
      writeStoredDemo(serializeBoard(next));
      return;
    }
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
    // The same copy is written into the file's "Human Users" section, so the
    // page and a downloaded board always say the same thing.
    const intro = (
      <div className="intro">
        {HUMAN_INTRO.map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{withInlineCode(paragraph)}</p>
        ))}
      </div>
    );
    // Neither needs the File System Access API, so both show in either branch.
    const demoButton = (
      <button className="download-button" onClick={openDemo}>
        Try a Demo Board
      </button>
    );
    const starterDownload = (
      <button className="download-button" onClick={downloadStarter}>
        Download a starter board
      </button>
    );

    return (
      <section id="center">
        <h1>
          <TitleIcon />
          Cranban
        </h1>
        {intro}
        {openError && <p className="open-error">{openError}</p>}
        {supportsFilePicker ? (
          <>
            {pendingBoard && (
              <div className="pending-board">
                <button className="open-button" onClick={openPendingBoard}>
                  Open {pendingBoard.name}
                </button>
                <p className="pending-note">
                  This link points at a board on this computer. Browsers ask for
                  permission again after a page load, so it takes one click.
                </p>
              </div>
            )}
            <div className="start-actions">
              <button className="open-button" onClick={openFile}>
                Open kanban file
              </button>
              {demoButton}
              {starterDownload}
            </div>
            {recents.length > 0 && (
              <div className="recent-files">
                <h2>Recent files</h2>
                <ul>
                  {recents.map((recent) => (
                    <li key={recent.id}>
                      <button
                        className="recent-file"
                        onClick={() => openRecent(recent)}
                      >
                        <span className="recent-name">{recent.name}</span>
                        {recent.title && (
                          <span className="recent-title">{recent.title}</span>
                        )}
                        <span className="recent-time">
                          {relativeTime(recent.lastOpened)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <label htmlFor="file-input">Select kanban file</label>
            <input
              id="file-input"
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleFileSelect}
            />
            <div className="start-actions">
              {demoButton}
              {starterDownload}
            </div>
          </>
        )}
        <ThemePicker theme={theme} onChange={changeTheme} />
      </section>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="board-title">
          <TitleIcon />
          {board.title ?? "Cranban"}
        </h1>
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
        <button
          className="switch-boards"
          title={
            demo
              ? "Leave the demo and pick a file"
              : "Close this board and pick another"
          }
          onClick={switchBoards}
        >
          {demo ? "Back" : "Switch Boards"}
        </button>
        {demo && (
          <button
            className="switch-boards cta"
            title={`Save this board as ${STARTER_FILE_NAME}, then open it to keep working in it`}
            onClick={downloadBoard}
          >
            Download File
          </button>
        )}
        <ThemePicker theme={theme} onChange={changeTheme} />
        {/* The banner says what happens to demo edits, so the file-save status
            would only contradict it. */}
        {demo ? null : readOnly ? (
          <span className="save-status">
            Read-only — editing and saving require a Chromium Browser
          </span>
        ) : (
          <span
            className={`save-status save-status-${saveStatus}`}
            title="Your edits are written straight back to the .txt file on disk. This shows whether the latest change has been saved."
          >
            {saveStatus === "idle" && "Auto-saves to file"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" &&
              (savedAt
                ? `Saved to file at ${savedClockTime(savedAt)}`
                : "Saved to file")}
            {saveStatus === "error" && (
              <>
                Error saving <button onClick={retrySave}>Retry</button>
              </>
            )}
          </span>
        )}
      </header>
      {demo && <p className="demo-banner">{withInlineCode(DEMO_BANNER)}</p>}
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

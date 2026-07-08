import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Board, SaveStatus } from "./types";
import { parseBoard } from "./parser";
import { serializeBoard } from "./serializer";
import { createFileWriter } from "./fileWriter";
import type { FileWriter } from "./fileWriter";
import { useBoard } from "./useBoard";
import BoardView from "./components/BoardView";

const supportsFilePicker = "showOpenFilePicker" in window;

function App() {
  const { board, boardRef, load, apply, restore } = useBoard();
  const [fileName, setFileName] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [openError, setOpenError] = useState<string | null>(null);
  const [writer, setWriter] = useState<FileWriter | null>(null);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  // The file text this app last loaded or wrote; polling compares against it
  // so our own saves are not mistaken for external edits.
  const lastTextRef = useRef<string | null>(null);

  const readOnly = board !== null && writer === null;

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
      if (document.activeElement instanceof HTMLInputElement) return;
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
            load(parseBoard(text));
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

  async function openFile(): Promise<void> {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "Kanban text", accept: { "text/plain": [".txt"] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      setWriter(createFileWriter(handle, setSaveStatus));
      setFileHandle(handle);
      setFileName(handle.name);
      setSaveStatus("idle");
      setOpenError(null);
      lastTextRef.current = text;
      load(parseBoard(text));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setOpenError(`Could not open file: ${String(error)}`);
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
    load(parseBoard(text));
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
          <button className="open-button" onClick={openFile}>
            Open kanban file
          </button>
        ) : (
          <>
            <label htmlFor="file-input">Select Kanban file</label>
            <input
              id="file-input"
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileSelect}
            />
          </>
        )}
      </section>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1 className="board-title">{board.title ?? "Kanban"}</h1>
        <span className="file-name">{fileName}</span>
        {readOnly ? (
          <span className="save-status">
            Read-only — editing and saving require Chrome or Edge
          </span>
        ) : (
          <span className={`save-status save-status-${saveStatus}`}>
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && (
              <>
                Error saving <button onClick={retrySave}>Retry</button>
              </>
            )}
          </span>
        )}
      </header>
      {board.columns.length === 0 ? (
        <p className="board-empty">No columns found in this file.</p>
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

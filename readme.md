# Kanban Txt

A local-first Kanban board that reads and writes a plain `.txt` file. The file
is meant to live in source control alongside the project it tracks, so your
board is versioned with your code, diffs in pull requests, and is editable in
any text editor — no database, no account, no server.

The file is Markdown-ish: `##` headings are columns and list items are cards.
It keeps the `.txt` extension on purpose, so the format stays free to grow its
own conventions beyond standard Markdown. This repo's own `kanban.txt` is a
working example.

## The file format

```
# Kanban

## To Do

1. Load file in web app
2. Write to file from web app

## In progress

1. Set up Claude Code
    1. A description line — nested under its card.

## Done

1. Create Repo
```

Mapping to the board:

- `# ` — the board title (the first one wins; later `#` lines are ignored).
- `## ` — a column. Cards that appear before the first `##` are ignored.
- A top-level list item — a card title.
- An indented list item — a description line on the card above it.

The parser is deliberately tolerant and never throws:

- Line endings `\r\n`, `\r`, and `\n` are all accepted.
- List markers `1.`, `1)`, `-`, and `*` are all treated as cards. The numbers
  are cosmetic — order in the file is the order on the board.
- Any indent (space or tab, any depth) makes a list item a description line.
- Blank lines and unrecognized lines (including `###` and deeper headings) are
  skipped.

When the app saves, it re-emits a canonical form: cards renumbered `1., 2., …`,
description lines as 4-space-indented numbered items, one blank line between
blocks, and a trailing newline. Parsing then re-serializing a board is a
round-trip (identical modulo internal ids), so hand-edits and app edits
converge on the same clean layout.

## How it works

- **Read/write the real file.** In Chromium browsers the app uses the
  [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
  to open your `.txt` and write edits straight back to disk. Writes go through
  a swap file that atomically replaces the target.
- **Auto-save.** Every edit is serialized and written immediately. Concurrent
  saves collapse to the newest text (latest wins). The header shows the status
  and the clock time of the last successful save.
- **External edits sync back.** With no change events on the file handle, the
  app polls the file about once a second and reloads the board when the file
  changes on disk — so editing the `.txt` in your editor updates the open app.
  Polling stands down while you're typing in an inline editor or while the
  app's own write is in flight, so nothing clobbers an in-progress edit.
- **Recent files.** `FileSystemFileHandle`s can't go in `localStorage` but are
  structured-cloneable into IndexedDB, so recently opened files are remembered
  (up to 8) and offered on the start screen. Reopening one skips the picker
  after a permission re-prompt.
- **Archive instead of delete.** The `×` on a card moves it to an `Archived`
  column with a `(deleted YYYY-MM-DD HH:MM)` timestamp appended to its title,
  rather than dropping it. The **Archive** tab lists archived cards
  newest-first and can restore them (the timestamp is stripped on restore). An
  older `Deleted` column name is still recognized for backward compatibility.
- **Drag, drop, and inline edit.** Cards drag within and between columns
  (pointer or keyboard, via [@dnd-kit](https://dndkit.com)). Click a title or a
  note to edit in place; notes are auto-growing textareas. Enter commits,
  Shift+Enter adds a line, Escape cancels.

### Browser support

Reading, editing, and saving need the File System Access API, available in
Chrome and Edge. Other browsers (Firefox, Safari) fall back to a file input
that loads a board **read-only** — you can view it but not save changes.

## Project structure

```
src/
  App.tsx            App shell: open/pick files, save status, Board/Archive tabs, external-edit polling
  useBoard.ts        Board state hook (current board + ref + apply/load helpers)
  parser.ts          .txt  -> Board
  serializer.ts      Board -> .txt (canonical form)
  boardOps.ts        Pure Board -> Board operations (move, edit, archive, restore, …)
  fileWriter.ts      Serialized, latest-wins writes to a file handle + save status
  recentFiles.ts     IndexedDB-backed recent files
  types.ts           Board / Column / Card / SaveStatus types
  file-system-access.d.ts  Type declarations for the File System Access API
  components/
    BoardView.tsx    The columns, drag-and-drop wiring
    ColumnView.tsx   A single column and its add-card control
    CardView.tsx     A card, its notes, and inline editing
    ArchiveView.tsx  The archived-cards list
```

## Development

The app is [Vite](https://vite.dev) + React + TypeScript.

```bash
npm install      # install dependencies
npm run dev      # start the dev server with HMR
npm run build    # type-check (tsc -b) and build for production
npm run preview  # serve the production build locally
npm run lint     # run ESLint
```

Then open the dev server URL, click **Open kanban file**, and pick a `.txt`
(try this repo's `kanban.txt`).

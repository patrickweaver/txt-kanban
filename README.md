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
    - Tags: filesystem
2. Write to file from web app
    - Description: When changes are made in the web app, update the local .txt file.
    - Tags: filesystem, updates

## In progress

1. Set up Claude Code

## Done

1. Create Repo
```

Mapping to the board:

- `# ` — the board title (the first one wins; later `#` lines are ignored).
- `## ` — a column. Cards that appear before the first `##` are ignored.
- A top-level list item — a card title.
- An indented list item — a `Title: value` **property** of the card above it.
  Two titles are known: `Description:` adds a note line, and `Tags:` adds
  comma-separated tags. Any other title is preserved but flagged in the UI as an
  unknown property (see [Tags](#tags)).

The parser is deliberately tolerant and never throws:

- Line endings `\r\n`, `\r`, and `\n` are all accepted.
- List markers `1.`, `1)`, `-`, and `*` are all treated as cards. The numbers
  are cosmetic — order in the file is the order on the board.
- An indented item counts as a property only when it starts with a single-word
  `Title:`. Anything else — including a colon-less line or prose that merely
  contains a colon — is treated as a plain description line, so older files
  still parse.
- Blank lines and unrecognized lines (including `###` and deeper headings) are
  skipped.

When the app saves, it re-emits a canonical form: cards renumbered `1., 2., …`;
each card's properties as 4-space-indented `- Description:` lines, then a single
`- Tags:` line, then any preserved unknown properties; one blank line between
blocks; and a trailing newline. Parsing then re-serializing a board is a
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

### Tags

Cards carry tags from a `- Tags:` property (comma-separated). They render as
small neutral chips on the card — one uniform style, since per-tag colors
couldn't be preserved in the `.txt`.

- **Add** a tag with the `+ tag` button on a card; type and press Enter (the
  composer stays open so you can add several in a row).
- **Edit or remove** a tag by clicking it: a small modal opens with the tag's
  text and **Save** / **Remove** buttons.
- **Filter** the board with the **Filter** bar between the header and the
  columns. It lists every tag currently in use (deduplicated case-insensitively);
  click one to show only cards carrying it, and click it again — or **Clear** —
  to reset. Dragging is disabled while a filter is active. All of this just
  edits the `- Tags:` lines in the file.

An indented property whose title isn't `Description` or `Tags` is kept in the
file untouched but shown on the card as an `Unknown Property: <title>` error, so
a typo surfaces instead of silently disappearing.

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
  boardOps.ts        Pure Board -> Board operations (move, edit, tag, archive, restore, …)
  fileWriter.ts      Serialized, latest-wins writes to a file handle + save status
  recentFiles.ts     IndexedDB-backed recent files
  types.ts           Board / Column / Card / SaveStatus types
  file-system-access.d.ts  Type declarations for the File System Access API
  components/
    BoardView.tsx    The columns, drag-and-drop wiring, and tag filter bar
    ColumnView.tsx   A single column and its add-card control
    CardView.tsx     A card: title, notes, tags, and inline editing
    TagModal.tsx     Edit/remove a single tag (portaled dialog)
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

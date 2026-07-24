# Cranban

Cranban is a local-first kanban board that saves data in a `.md` or `.txt` file. The file
is meant to lives on your computer, or in source control alongside the code for your project, so you can also edit it a text editor, and you will see changes to the board in diffs and PRs.

The Cranban file format is based on Markdown. `##` headings are columns and list items below a heading are the cards on the board.
The `cranban.md` file in this repo is an example of a file, and was used to create the project!

## Cranban file format

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

- `# ` is the board title (only one is allowed, additional `#` lines are ignored).
- `## ` is a column. Anything that appears before the first `##` is ignored.
- `## Settings` and `## About Cranban` are the two reserved headings. Neither is
  a column, so neither is shown on the board: Settings holds board-level config
  (see [Settings](#settings)), and About Cranban holds the explanation of the
  format written into new boards (see [Getting started](#getting-started)).
- A top-level list item is a card title.
- An indented list item is a `key: value` property of its parent card.
  Three keys are currently supported: `Description:` is the card's description, `Date:`
  is a created at metadata field, and `Tags:` adds comma-separated tags. Any other key is
  preserved but flagged in the UI as an unknown property (see [Tags](#tags)).

A card has max one description, which can span multiple lines. Extra lines are
written nested under the `- Description:` item. Anything indented deeper
than the card's property level continues the description. Continuation lines
keep their own list markers and their indentation relative to the
`- Description: ` content column, so a description can hold a nested markdown
list:

```
1. Update Design
   - Description: There should be 3 themes:
     1. Default Cranberry
        - A vaguely cranberry colored theme.
     2. Boring
   - Tags: Design
```

Blank lines can't appear inside a description (the parser skips them), so they
are dropped when a description is edited in the app. Multiple `- Description:`
lines in a hand-edited file still parse: they are joined with newlines and
collapse to one item on the next save.

The parser is deliberately tolerant and never throws:

- Line endings `\r\n`, `\r`, and `\n` are all accepted.
- List markers `1.`, `1)`, `-`, and `*` are all treated as cards. The numbers
  are cosmetic, order in the file is the order on the board.
- An indented item counts as a property only when it starts with a single-word
  `key:`. Anything else, including a colon-less line or text that
  contains a colon is treated as a plain description line.
- Blank lines and unrecognized lines (including `###` and deeper headings) are
  skipped.

When the app saves, it re-emits a canonical form:

- Cards renumbered `1., 2., …` with each card's properties as `- key: value` items indented to the card's content column (3 spaces under `1. `, 4 under `10. `). This is the same alignment markdown formatters like Prettier produce, so formatting the file in a text editor and saving from the app should be the same.
- A single `- Description:` item with continuation lines nested
  under it.
- A `- Date:` item
- A single `- Tags:` item
- Any preserved unknown properties; one blank line between blocks
- A trailing newline

## How it works

- **Reads/Writes** In Chromium browsers the app uses the
  [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API)
  to open your file and write edits straight back to disk. Writes go through
  a swap file that atomically replaces the target.
- **Auto-save** Every edit is serialized and written immediately. Concurrent
  saves collapse to the newest text (latest wins). The header shows the status
  and the clock time of the last successful save.
- **External edits sync back** With no change events on the file handle, the
  app polls the file about once a second and reloads the board when the file
  changes on disk. Editing the `.txt` in your editor updates the open app.
  Polling pauses while you're typing in an inline editor or while the
  app's own write is in flight, so interferes with an in-progress edit.
- **Recent files.** `FileSystemFileHandle`s can't go in `localStorage` but are
  structured-cloneable into IndexedDB, so recently opened files are remembered
  and offered on the start screen. Reopening one skips the picker
  after a permission re-prompt.
- **Boards URLs** The open board is reflected in the hash as
  `#<id>-<file name>` (e.g. `#3-kanban.md`), so a board can be bookmarked and
  reopened directly, and **Switch Boards** in the header returns to the picker
  at the root URL. The hash cannot contain
  the file's _path_: the File System Access API never exposes one, and a page
  can't turn a path into a handle even if it had it. Instead the id references the
  handle already stored in IndexedDB, and the name keeps the link legible and
  serves as a fallback. A link only resolves in a browser that has opened that
  file before; elsewhere it shows an explanation message and falls back to the picker.
  Because file permission doesn't survive a page load, following a link
  usually costs one click to re-grant it.
- **Archive** The `×` on a card moves it to an `Archived`
  column with a `(deleted YYYY-MM-DD HH:MM)` timestamp appended to its title. The **Archive** tab lists archived cards
  newest-first and can restore them (the timestamp is stripped on restore).
  Empty columns show their own `×` (with a confirm dialog). Removing a column
  is permanent, there is no column archive. A new column can't be named after a
  reserved heading (`Settings`, `About Cranban`, `Archived`/`Deleted`): the
  dialog explains why and Save stays disabled.
- **Drag, drop, and inline edit.** Cards drag within and between columns
  (pointer or keyboard, via [@dnd-kit](https://dndkit.com)); columns reorder by
  dragging their header, and the new order is written back to the file. Click a
  title or a description to edit in place; the description is a single
  auto-growing textarea that can span multiple lines. Enter commits,
  Shift+Enter adds a line, Escape cancels. Clearing the description removes it.

### Tags

Cards carry tags from a `- Tags:` property (comma-separated). They render as
small neutral chips on the card.

- **Add** a tag with the `+ tag` button on a card; type and press Enter (the
  composer stays open so you can add several in a row).
- **Edit or remove** a tag by clicking it: a small modal opens with the tag's
  text and **Save** / **Remove** buttons.
- **Filter** the board with the **Filter** bar between the header and the
  columns. It lists every tag currently in use (deduplicated case-insensitively);
  click one to show only cards with that tag, and click "clear" or the tag again
  to reset the filter. Dragging is disabled while a filter is active.

An indented property whose title isn't `Description` or `Tags` is kept in the
file untouched but shown on the card as an `Unknown Property: <title>` error.

### Getting started

The start screen explains what Cranban is and offers **Download a starter
board** (`cranban.md`), so there is something to open without hand-writing a
file first. Opening a file that is empty (or only whitespace) seeds it with
that same starter board. A file
that fails to parse is not overwritten.

**Try a Demo Board** opens a filled-in board with no file behind it: three
columns, a few cards with dates, tags and descriptions, and everything
editable. Its text is kept in this browser's local storage rather than on
disk, so edits survive a refresh but are not written to
a file. **Download File** in the header saves the board as is, and opening that file turns the demo into a real board. Because none
of it touches the File System Access API, the demo is also the only way to try
Cranban in Firefox or Safari.

The starter board is a title, an empty `## To Do`, and an `## About Cranban`
section with two subsections: **Human Users**, the same copy the start screen
shows, and **LLM Users**, a short prompt describing the syntax for coding
agents editing the file directly. All of it comes from one template in
`starterBoard.ts`, so the page and the file can't drift apart.

`## About Cranban` is free-form, not board data, so it is not parsed or updated. It includes fenced code blocks, with
`##` example lines that are not read as column headings. It is
never rendered in the app.

### Settings

A `## Settings` section holds board-level configuration as `- Title: value`
items. It lives between the active columns and `## Archived`, and the app
writes it back in that position regardless of where you put it in the file:

```
## Settings

- Theme: dark-boring
```

`Theme` is currently the only setting. Because it lives in the file, the theme
travels with the board through source control instead of being a per-browser
preference, and editing the line in a text editor re-themes the open app on the
next poll. Values are read leniently, the id (`dark-boring`) or the label
(`Dark Boring`) both work, in any casing. The value is preserved
as-is until you pick a theme in the UI. Settings the app doesn't recognize are
preserved untouched, so the section is safe to extend by hand.

There are two places a theme can come from:

- **The file**, for boards that set one. Picking a theme with a board open
  writes it to that board's `## Settings`.
- **A browser-local default**, for boards whose file says nothing. Picking a
  theme on the start screen stores it in `localStorage` and it survives a
  refresh. This is applied by a small inline script in `index.html` before first
  paint, so there's no flash of the wrong theme on load.

A per-board pick is never promoted to the local default, so theming one board
doesn't silently change how every other unthemed board looks. Nothing is
written to a file until you actually choose a theme, and an unreadable or
unrecognized stored value falls back to the default rather than sticking.

### Browser support

Editing and saving need `showOpenFilePicker` and the writable handle it
returns, the File System Access API's picker extensions, available in Chromium based browsers. (Firefox and Safari do implement the rest of the File System API,
`createWritable` included, but only over the origin-private file system:
sandboxed storage) Other browsers (Firefox, Safari) fall back to a file input
that loads a board read-only. The demo board is fully editable everywhere, since it never writes to a
file.

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
  boardUrl.ts        The `#<id>-<name>` board hash, the `#demo` hash, and why it can't be a path
  starterBoard.ts    Canned board text: seed, download, demo, and start-screen copy
  demoStore.ts       The demo board's text, kept in localStorage instead of a file
  themes.ts          The selectable themes and lenient theme-value parsing
  types.ts           Board / Column / Card / Setting / SaveStatus types
  file-system-access.d.ts  Type declarations for the File System Access API
  components/
    BoardView.tsx    The columns, drag-and-drop wiring, and tag filter bar
    ColumnView.tsx   A single column and its add-card control
    CardView.tsx     A card: title, notes, tags, and inline editing
    TagModal.tsx     Edit/remove a single tag (portaled dialog)
    ColumnModal.tsx  Name and create a new column (portaled dialog)
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

Then open the dev server URL, click **Open kanban file**, and pick a `.txt` or
`.md` file (try this repo's `cranban.md`).

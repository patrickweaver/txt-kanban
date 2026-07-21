# Kanban

## Backlog

1. Seed empty files
   - Description: If an empty file is opened create a default empty "To Do" list
     Also add a "Cranban Board" top level header.
   - Date: 2026-07-21T04:38:32.453Z
2. Add explanation prompt to board
   - Description: A new board should have a short agent-facing prompt explaining how the project works with examples of syntax.
   - Date: 2026-07-21T04:57:35.660Z
3. Explanation
   - Description: Add an explanation to the default page before any files are selected
   - Date: 2026-07-21T04:58:38.663Z
4. Update favicon
   - Date: 2026-07-21T04:59:04.797Z
5. Create a default list as a downloadable file
   - Date: 2026-07-21T04:59:30.387Z

## To Do

## In progress

## Done

1. Create Repo
2. Load file in web app
   - Tags: filesystem
3. Set up Claude Code
4. Write to file from web app
   - Tags: filesystem
5. Allow editing .txt file directly
   - Description: Updates to the .txt file via a text editor should be allowed. This should not cause a problem, even if the web app is open. The updates made directly should populate in the web app.
   - Tags: filesystem
6. Design tweaks
   - Description: There is no visual space between a new card title being edited, and the card above it.
   - Tags: design
7. Don't show and hide the "+note" button on hover
   - Description: The +note button should always be visible unless there is already a note.
8. Read file paths from local storage
   - Description: Save the paths of recently opened kanban files in localstorage and suggest them on the start page. Clicking one of the paths opens it and bypasses the file picker.
9. Deleted List
   - Description: Add a ## Deleted list to the .txt file (or use the one that exists if it is already there). Cards that are removed with the 'x' button should be moved to the Deleted list. Cards should have a a deleted at timestamp appended to the title when moved to deleted so we can list them in a recently deleted list. Tabs at the top of the kanban board, "Board", and "Archive", and when Archive is clicked, toggle to an "Archive" mode that replaces the current lists with a single Archive list.
10. Note should be a textarea
    - Description: Notes are hard to edit when they get long, it should use <textarea>.
11. Explain or remove "Saved"
    - Description: There is a small "Saved" <span> in the top right. Either put an explanation about what that does, or remove it. Kept it and made it self-explanatory: an "Auto-saves to file" idle label, "Saved to file" wording, and a tooltip describing the write-to-disk behavior.
12. Update the readme explaining the project
    - Description: The readme is currently the default React + TypeScript + Vite boilerplate. Leave anything useful from there for setting up the project, but update it with details about how the project works. Rewrote it: what the project is, the .txt DSL and parser tolerance, how save/sync/archive/drag work, browser support, a module map, and the setup commands.
13. Update kanban.txt format
    - Description: I updated the example format in CLAUDE.md. Now, instead of a <ol> sublist, the format will use <ul> with titles separated by : on each <li>. The current known titles are "description" and "tags". Parser and serializer now read/write `- Title: value` items; unknown titles are preserved on save.
14. Render tags on card
    - Description: If a card has a "tags" list item, render a list of tags. The design should be rectangles with slightly rounded corners, not pills. Don't use different colors for each tag because we can't preserve them across loads of the file.
15. Alert on invalid titles
    - Description: If a card has a list item with a title that is not one of the known values, show an error message at the bottom, "Unknown Property: [TITLE]".
16. Update tags in UI
    - Description: The tags should be updatable in the UI. To add a new tag, click a "+ tag" button similar to the note button. To remove a tag click on it, which opens a modal. The modal has an editable text field with the tag value, and two buttons "Remove", "Save". Added a "+ tag" composer, clickable tag chips, and a portaled edit/remove modal wired through pure addTag/updateTag/removeTag ops.
    - Tags: tagging-system, feature
17. Show all current tags in a filter bar at the top.
    - Description: Between the header and the lists in the board, show a "Filter" section, which lists all tags (non case sensitive) that are currently on cards. Clicking on one of the tags filters the view to only cards with that tag. Filter bar sits between header and columns; dragging is disabled while a filter is active and stale filters auto-clear.
    - Tags: tagging-system, feature, filtering
18. Update the readme with the tagging system
    - Description: Documented the tagging system (add/edit/remove, filter bar, unknown-property errors) and refreshed the file-format section for the new property DSL.
    - Tags: documentation
19. Add date metadata
    - Description: When a card is created in the UI, add a list item to the sublist with the title "Date" and an ISO timestamp. If a card is added by editing the file, allow any date format that is parsable by JavaScript. Added a known "Date" property; UI-created cards get an ISO timestamp, file-edited dates accept epoch ms or any Date.parse-able string, and the raw value is preserved on save.
    - Date: 1783572015618
    - Tags: dates
20. Render Date on card
    - Description: If a card has a date field, show it below the title of the card in the format YYYY-MM-DD HH:MM.
    - Tags: dates
21. Keyboard navigation: New Cards
    - Description: Hitting enter after writing the title on a new card should automatically open the "Note"/"Description" textarea for editing. The composer now closes on Enter and the new card auto-opens its focused description editor.
    - Tags: keyboard
22. Rename "Note" in UI
    - Description: Rename "Note" to "Description" in UI to match the .txt format. The card button now reads "+ description".
23. Boostrap new file
    - Description: Starting with an empty file I am not able to create new columns. Add a "+Column" button at the top with the Board/Archive tabs. When the button is clicked, open a modal with "Cancel" and "Save" buttons. Added a "+ Column" header button and a ColumnModal (name input + Cancel/Save); new columns are inserted before any archive column and the view switches to Board.
    - Date: 2026-07-09T05:15:50.035Z
    - Tags: getting-started
24. Non fixed width layout
    - Description: The board layout should take the full browser width. The 1126px cap on #root is lifted while a board is open (the start screen stays centered); wide boards scroll horizontally.
    - Date: 2026-07-09T05:32:53.181Z
    - Tags: design, layout
25. Column width: 300px
    - Description: Columns should always be 300px wide and should not grow with the space allotted. If there is only one column it should be left aligned. Columns are now flex 0 0 300px (border-box), so they never grow; a lone column sits at the left edge.
    - Date: 2026-07-09T05:33:16.045Z
    - Tags: design, layout
26. Rearrange columns
    - Description: Columns should be drag and drop to reorder them in the UI and in the file. Columns are dnd-kit sortables dragged by their header; a moveColumn op reorders board.columns so the file is rewritten in the new order. Column drags only collide with columns; card drag-and-drop is unchanged.
    - Date: 2026-07-09T05:34:11.721Z
    - Tags: design, feature
27. Moved columns blinking
    - Description: When columns are moved they blink and disappear briefly when the user lets go of the drag. Fixed in two steps. First, columns reorder live during dragOver (like cards) so the drop slot is already final. That still blinked because the real column node followed the pointer and its transform cleared in one frame on release. Final fix: columns now use a DragOverlay like cards do. A ColumnOverlay copy follows the pointer, the real column stays in its slot as a 0.4-opacity ghost with no transform, and the drop animates the overlay into place.
    - Date: 2026-07-16T04:15:28.552Z
    - Tags: design, dragging
28. Active column design
    - Description: When columns are moved they switch into an active state (different color), only when the drag starts. They should change color as soon as the user clicks and the drag could start. The column now tints (accent background/border) on pointer-down on the header, before the 8px drag activation, and stays tinted until release.
    - Date: 2026-07-16T04:16:14.161Z
    - Tags: design, dragging
29. Bug: Long cards cause drag not to work
    - Description: When there are at least two cards with long descriptions, column dragging does not work. There is a minimal reproduction in kanban-empty.txt. Root cause was corner-based collision detection, where a tall column or card's corner distances swamp the horizontal signal. Column drags now compare horizontal centers only; card drags target whatever is under the pointer (pointerWithin) with corner distance as the gap fallback.
    - Date: 2026-07-17T04:24:18.272Z
    - Tags: dragging, bug
30. Remove Column
    - Description: If a column is empty it should render an 'x' in the top right corner like a card, and clicking the 'x' a modal should show that confirms the user wants to remove the column. The modal has "Cancel" and "Confirm" buttons. Clicking "Confirm" removes the column. Clicking "Cancel" closes the modal. There is no Archive for columns, they are permanently deleted. The x reveals on hover for empty columns only, and the removeColumn op refuses to delete a column that has cards.
    - Date: 2026-07-17T04:25:24.872Z
    - Tags: feature
31. Move new column button
    - Description: The new column button should be to the right of the rightmost column. It should be the same width as a column. Moved out of the header into the board row as a 300px dashed ghost column owned by BoardView; it also replaces the old empty-board message as the bootstrap path for empty files.
    - Date: 2026-07-17T05:24:13.285Z
    - Tags: Design
32. Support .md files
    - Description: The app should support .md files, treating them the same as .txt files. The file picker and the read-only fallback input now accept .txt and .md; everything downstream was already extension-agnostic.
    - Date: 2026-07-17T05:27:34.247Z
33. Bug: Each line on a card is a separate textarea.
    - Description: There should only be one description item per card, it should support newlines. If newlines will break the markdown rendering in the unordered list in the file, then we should replace them with `\n` in the file. Cards now have a single description edited in one auto-growing textarea (Shift+Enter inserts a line); the file stored it as a single `- Description:` line with newlines escaped as `\n` (since superseded by nested continuation lines, ticket 34), and legacy multi-line descriptions are joined on load. Clearing the text removes the description.
    - Date: 2026-07-20T04:01:32.856Z
34. Nested lists for descriptions
    - Description: I formatted the markdown file with nested lists, can we support this for descriptions rather than `\n`? Replaced the `\n` escapes: any line indented deeper than a card's property level now continues the description, keeping its own list marker and its indentation relative to the `- Description: ` content column, so nested markdown lists survive a round-trip. The serializer indents properties to the card's content column (3 spaces under `1. `, 4 under `10. `), matching what Prettier produces, so formatting the file and saving from the app converge. Blank lines can't be represented, so they are dropped on commit.
    - Date: 2026-07-20T05:12:00.000Z
35. Bug: Description starts with empty line
    - Description: When creating a new card in the UI, after hitting enter from the title input field, the description field becomes editable, but it starts with a blank line and the cursor on the second line. The card composer's Enter handler committed without calling preventDefault. Committing unmounts the title input and focuses the new card's description textarea within the same event, so Enter's default action inserted its newline into that textarea. The handler now calls preventDefault, matching what the inline title/description editor already did. (Enter's trailing trim on commit is why the blank line vanished on save.) The tag composer had the same missing preventDefault and got it too.
    - Date: 2026-07-21T03:15:00.826Z
36. Update Design
    - Description: There should be 3 themes:
      1. Default Cranberry
         - This is a vaguely cranberry colored theme. The page background is a very light reddish pink, the borders are a dark cranberry, and the column backgrounds are a brighter cranberry.
      2. Boring
         - This is a light theme that is more boring than the current theme. The highlight color is a purplish blue. Update the other colors to be a bluish gray rather than beige, but otherwise similar to the current theme.
      3. Dark Boring
         - This is a standard dark theme, maybe slightly cranberryish.
      First pass on the UI side only, with the choice held in React state (persisting it to the file is its own ticket). Each theme is a `:root[data-theme="<id>"]` block of the existing CSS variables in index.css, listed in themes.ts and applied by App to the root element. Attribute selectors outrank the prefers-color-scheme media query, so an explicit pick beats the OS setting in both directions, and each theme sets color-scheme so native controls follow. A Theme dropdown sits in the board header and on the start screen.
    - Date: 2026-07-17T04:49:18.627Z
    - Tags: Design
37. Design Iterations
    - Description: General:
      - Make borders slightly thicker
      - In all themes make the page background slightly different than the card background.
      Cranberry:
      - Make sure all text is WCAG AAA compliant.
      Boring:
      - Make the columns slightly more saturated with blue/purple color
      Dark Boring:
      - Make borders have slightly more contrast
      Added two variables: --border-width (2px, used by cards, columns, modals and the add-column ghost) and --card-bg, so the page and the raised surfaces are distinct in every theme. Cranberry AAA was verified by auditing the rendered DOM rather than by eye: each text node's effective background is composited through its ancestors and checked against 7:1 (4.5:1 for large text). That found the accent-on-accent-tint active tab at 6.43:1, fixed by darkening the accent to the lightest value that clears 7:1 on all four surfaces (#850429). The audit also caught that saturating Boring's columns dropped `+ Add card` and tag chips to 3.95:1, under even AA, so its --text went to #556377. Cranberry now has zero AAA failures; Boring and Dark Boring pass AA everywhere.
    - Date: 2026-07-21T04:04:00.810Z
    - Tags: Design
38. Save theme in markdown file
    - Description: Themes should be more than a client setting.
      Between the end of the lists of active cards and the "Archived" section of the markdown file, there should be a "Settings" section. This section is not populated as a list in the board.
      Currently the only setting is the theme. This can be stored as an unordered list with titles like card titles are.
      `## Settings` is now the one reserved heading: the parser routes it to board.settings instead of board.columns, so it can never render as a column, and the serializer always writes it back between the last active column and the archive. Settings are `- Title: value` items kept as an ordered list, so unrecognized ones round-trip untouched. Values are read leniently (id or label, any casing) and left as typed until the picker rewrites them. Picking a theme saves it; opening a file adopts its theme; an external edit to the line re-themes the app on the next poll. A file with no Theme keeps the current selection, and nothing is written until a theme is actually picked.
    - Date: 2026-07-20T04:05:15.476Z
39. Local default Theme
    - Description: The theme selected on the file picker page should be saved in local storage and be the local default for new boards. On refresh it should be preserved.
      Also rename "Default Cranberry" to just "Cranberry" since we are adding a local default.
      Picking a theme on the start screen writes it to localStorage; picking one with a board open still goes to that file's Settings and deliberately does not touch the local default, so theming one board can't change how every other unthemed board looks. The stored theme is applied by an inline script in index.html before first paint, so a refresh doesn't flash the wrong theme. Unreadable storage (private mode) and unrecognized values fall back to the default rather than sticking. The old "Default Cranberry" label is kept as a resolver alias so files written or hand-edited before the rename still load.
    - Date: 2026-07-21T04:26:56.373Z
40. Save local file path in URL Hash
    - Description: The URL hash should be set to the file path of the file when one is opened. Navigating to that URL should open that file and skip the file picker.
      The path itself cannot go in the URL: the File System Access API never exposes a file path, and a page cannot turn a path into a handle even if it had one, so opening always needs the picker or a handle the browser already stored. The hash instead carries `#<recents id>-<file name>` (e.g. `#3-kanban.md`), resolving the id against the handle already kept in IndexedDB, with the name keeping links legible and acting as a fallback. rememberFile now returns its stable record id. Permission does not survive a page load, so a link opens silently when the browser still grants it and otherwise shows a one-click "Open <name>" prompt. A link that matches nothing in this browser closes the board and explains itself rather than leaving the address bar contradicting the screen.
    - Date: 2026-07-21T04:28:37.733Z
41. Switch Boards
    - Description: Add a "Switch Boards" button that navigates back to the root URL and the file picker
      The header button pushes the root URL and closes the board, leaving a history entry so Back returns to it; a hashchange listener keeps browser navigation and the displayed board in sync in both directions.
    - Date: 2026-07-21T04:36:23.346Z
42. Rename project "Cranban"
    - Description: The project should have a fun and googlable name that goes with the theme.
      Renamed everywhere the name is identity: the page title, the start screen heading, the default board title, package.json, README and CLAUDE.md. Deliberately not renamed: the IndexedDB database and the localStorage theme key, since changing those would orphan every stored file handle (losing recents and breaking the `#<id>-<name>` board links) and discard the saved theme. Both now carry comments saying so, and CLAUDE.md records the reasoning. Generic uses of "kanban" for the file format and the board concept were left alone.
    - Date: 2026-07-21T04:16:05.871Z

## Settings

- Theme: cranberry

## Archived

1. Test (deleted 2026-07-07 22:04)
2. Update Name (deleted 2026-07-08 20:32)
   - Description: The new name of the project is "Cranban"
3. ok yes (deleted 2026-07-08 20:38)
4. Test (deleted 2026-07-08 20:38)
5. Testing save (deleted 2026-07-08 20:45)
   - Description: Yes
6. Test Card (deleted 2026-07-19 21:08)
   - Description: This is a test card
   - Date: 2026-07-20T04:07:24.552Z
   - Ooops: This is invalid
7. Test Multi Line Card (deleted 2026-07-19 21:47)
   - Description: This card has
     linebreaks
     in it
     Even double
     linebreaks.
   - Date: 2026-07-20T04:45:41.606Z
8. Test Multi Line Card (deleted 2026-07-20 20:14)
   - Description: This is a test card with multiple lines.
     1. This is a list
         - With sublists
     2. This is the second item.
     What about another list?
     1. What if I don't indent?
     - OK no indent
     2. Hello
     - Yes
     - No
   - Date: 2026-07-21T03:12:38.386Z
9. Test Card (deleted 2026-07-20 20:25)
   - Description: yes it works now
     Yes ok!
   - Date: 2026-07-21T03:25:10.213Z

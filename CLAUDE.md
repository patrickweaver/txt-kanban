# Cranban

This is a local first web app that creates a kanban board from a .txt file. The .txt file is kept in source control with the project that is being worked on. In this repo, as an example, we have `kanban.md`.

The project is named Cranban, after the cranberry-colored default theme. The name appears in the UI, the page title, and package.json, but deliberately *not* in the IndexedDB database name or the localStorage theme key: renaming those would orphan stored file handles (losing recents and breaking board URLs) and discard the saved theme.

The .txt file has the structure seen in this example:

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

It is markdown, but txt is a better name, so we'll keep the .txt file. I also don't want to be restricted to official markdown syntax if we want to extend our DSL for any features.

The web app is a React app that loads the content of the .txt file, and parses it. The `<h2>` headings are the names of columns on the Kanban board, and the `<li>` items are titles cards on the Kanban board. A second level `<li>` would be descriptions on cards.

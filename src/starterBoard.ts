import { ABOUT_SECTION } from "./boardOps";

// The starter board, used three ways: seeded into an empty file, offered as a
// download on the start screen, and the source of the explanation shown there.
// Defining it once is what keeps the page and the file from drifting apart.

export const STARTER_FILE_NAME = "cranban.md";
export const STARTER_TITLE = "Cranban Board";

/** Shown on the start screen and written to the "Human Users" section. */
export const HUMAN_INTRO: string[] = [
  "Cranban turns a plain markdown file into a kanban board. The file lives in your project, so the board is versioned with your code, shows up in pull requests, and stays readable in any text editor. No account, no server, no database.",
  "Columns are ## headings and cards are the list items under them. Indent a line beneath a card to give it a description, a date, or tags. Everything you do here is written straight back to the file, and edits you make in your editor appear here within a second.",
  "Open a .txt or .md file to begin, or download a starter board to get going.",
];

// Agent-facing. Only ever written to the file; never rendered in the app.
const LLM_PROMPT: string[] = [
  "This file is a Cranban board. Edit it directly; the app reads and writes this same file.",
  "",
  "- `# ` is the board title. The first one wins.",
  "- `## ` starts a column. Order in the file is order on the board.",
  "- A top-level list item is a card. `1.`, `1)`, `-`, and `*` all work, and the numbers are cosmetic.",
  "- An indented `- Title: value` item under a card sets a property. `Description`, `Date`, and `Tags` are known; any other title is preserved but flagged in the UI as an unknown property, so a typo surfaces instead of vanishing.",
  "- A description can span lines: indent continuation lines past the `- Description: ` column and they keep their own markers, so a nested list survives.",
  "- Two headings are reserved and never render as columns: `## Settings` (board config, currently just `- Theme:`) and this `## About Cranban` section. `## Archived` holds removed cards.",
  "",
  "Example:",
  "",
  "```",
  "# Cranban Board",
  "",
  "## To Do",
  "",
  "1. Load file in web app",
  "   - Description: Parse the markdown into columns and cards.",
  "     Continuation lines are indented past the Description column.",
  "   - Date: 2026-01-31T09:00:00.000Z",
  "   - Tags: filesystem, parser",
  "```",
  "",
  "Saving rewrites the file in a canonical form: cards renumbered, properties ordered Description, Date, Tags, and indented to the card's content column. Keep edits in that shape and the diff stays small.",
];

/** The full starter file: title, one empty column, and the About section. */
export function starterBoardText(): string {
  return [
    `# ${STARTER_TITLE}`,
    "",
    "## To Do",
    "",
    `## ${ABOUT_SECTION}`,
    "",
    "### Human Users",
    "",
    ...HUMAN_INTRO.flatMap((paragraph) => [paragraph, ""]),
    "### LLM Users",
    "",
    ...LLM_PROMPT,
    "",
  ].join("\n");
}

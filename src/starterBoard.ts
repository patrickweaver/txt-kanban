import { ABOUT_SECTION } from "./boardOps";

// The canned board text: seeded into an empty file, offered as a download on
// the start screen, filled in as the demo board, and the source of the
// explanation shown on that screen. Defining it once is what keeps the page and
// the file from drifting apart.

export const STARTER_FILE_NAME = "cranban.md";
export const STARTER_TITLE = "Cranban Board";

/** Shown on the start screen and written to the "Human Users" section. */
export const HUMAN_INTRO: string[] = [
  "Cranban is a local-first (and only) kanban board UI with a `.md` file as the datastore. The file lives on your computer, or in your git repo, and is updated live when cards move or update on the board.",
  "Markdown with a local web UI is a great fit for collaborating with robots. You can update the to-dos in the UI, the robot can update the to-dos in the `.md` file, and both sides see the same updates in real time. Create a file, or download the starter board below to try it out!",
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
  "The file should always be valid markdown after any changes.",
];

/** The `## About Cranban` section, shared by the starter and demo boards. */
function aboutLines(): string[] {
  return [
    `## ${ABOUT_SECTION}`,
    "",
    "### Human Users",
    "",
    ...HUMAN_INTRO.flatMap((paragraph) => [paragraph, ""]),
    "### LLM Users",
    "",
    ...LLM_PROMPT,
  ];
}

/** The full starter file: title, one empty column, and the About section. */
export function starterBoardText(): string {
  return [`# ${STARTER_TITLE}`, "", "## To Do", "", ...aboutLines(), ""].join(
    "\n",
  );
}

/** Shown above the demo board. Backticks render as inline code. */
export const DEMO_BANNER =
  "This is a demo board and changes are not saved to a file. Download the board and open the `.md` file to save changes.";

/**
 * The demo board: the same file any user would keep, already filled in. It
 * carries the About section too, so downloading it yields a real starter file
 * rather than a stripped sample. Dates are stamped when the demo is created,
 * since a hard-coded one would read as stale the day after it was written.
 */
export function demoBoardText(): string {
  const now = new Date().toISOString();
  return [
    `# ${STARTER_TITLE}`,
    "",
    "## To Do",
    "",
    "1. Create a local Cranban board",
    "   - Description: Download this board, drop the file into a project, and open it with",
    "     the button on the start screen. From then on the board lives in your repo,",
    "     next to the code it describes.",
    `   - Date: ${now}`,
    "   - Tags: getting-started",
    "2. Make a fun project using Cranban",
    "   - Tags: ideas",
    "",
    "## In Progress",
    "",
    "1. Try out the Cranban demo",
    "   - Description: Drag this card to Done, rename it, give it a tag. Everything works",
    "     here — it just never reaches a file.",
    `   - Date: ${now}`,
    "   - Tags: getting-started, demo",
    "",
    "## Done",
    "",
    ...aboutLines(),
    "",
  ].join("\n");
}

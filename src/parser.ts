import type { Board, Card, Column } from "./types";

// Tolerance rules for the kanban .txt DSL:
// - Line endings: \r\n, \r, and \n all accepted.
// - `# ` sets the board title; the first one wins, later ones are ignored.
// - `## ` starts a column. `###` and deeper headings are not part of the DSL.
// - Cards accept `1.`, `1)`, `-`, and `*` markers. Numbers are discarded:
//   order in the file is the order on the board.
// - The first indented line under a card sets its property indent. List items
//   at that indent are properties, `Title: value`:
//     * `Description:` sets the description.
//     * `Date:` sets the card's date (kept verbatim; last one wins).
//     * `Tags:` appends comma-separated tags.
//     * any other single-token title is kept as an "unknown property".
//   An indented item that isn't `Title: value` (no single-word title before a
//   colon) is treated as a description line, so older files and prose
//   descriptions that merely contain a colon still parse.
// - Anything indented deeper than the property level is a continuation of the
//   card's description: the line keeps its own list marker and its indentation
//   relative to the `- Description: ` content column, so a description can
//   hold a nested markdown list. Multiple `Description:` properties and their
//   continuations are all joined with newlines.
// - Blank lines are skipped and do not detach a card from later properties.
// - Cards before the first `## ` and anything unrecognized are ignored.
//   The parser never throws.

const LIST_ITEM = /^([ \t]*)(?:\d+[.)]|[-*])[ \t]+(.*)$/;
// A property title is a single token (no whitespace) before the first colon.
const PROPERTY = /^([A-Za-z][\w-]*):[ \t]*(.*)$/;
const INDENT = /^[ \t]*/;

export function parseBoard(text: string): Board {
  const board: Board = { title: null, columns: [] };
  let currentColumn: Column | null = null;
  let currentCard: Card | null = null;
  // Indent width of the current card's property items; null until the first
  // indented line under the card sets it.
  let propIndent: number | null = null;

  function appendDescription(card: Card, value: string): void {
    card.description = card.description === "" ? value : `${card.description}\n${value}`;
  }

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.trimEnd();
    if (line === "") continue;

    if (line.startsWith("## ")) {
      currentColumn = { id: crypto.randomUUID(), name: line.slice(3).trim(), cards: [] };
      currentCard = null;
      board.columns.push(currentColumn);
      continue;
    }
    if (line.startsWith("### ")) continue;
    if (line.startsWith("# ")) {
      if (board.title === null) board.title = line.slice(2).trim();
      continue;
    }

    const indent = INDENT.exec(line)![0];

    if (indent === "") {
      const item = LIST_ITEM.exec(line);
      if (!item || !currentColumn) continue;
      currentCard = {
        id: crypto.randomUUID(),
        title: item[2],
        description: "",
        date: null,
        tags: [],
        unknownProps: [],
      };
      propIndent = null;
      currentColumn.cards.push(currentCard);
      continue;
    }

    if (!currentCard) continue;
    if (propIndent === null || indent.length < propIndent) propIndent = indent.length;

    if (indent.length > propIndent) {
      // Description continuation: strip up to the `- Description: ` content
      // column (property indent + "- ") and keep the rest verbatim, so nested
      // markers and deeper indentation round-trip.
      appendDescription(currentCard, line.slice(Math.min(indent.length, propIndent + 2)));
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (!item) {
      appendDescription(currentCard, line.slice(indent.length));
      continue;
    }
    const content = item[2];
    const prop = PROPERTY.exec(content);
    if (!prop) {
      appendDescription(currentCard, content);
      continue;
    }
    const [, title, value] = prop;
    const key = title.toLowerCase();
    if (key === "description") {
      appendDescription(currentCard, value);
    } else if (key === "date") {
      currentCard.date = value;
    } else if (key === "tags") {
      for (const tag of value.split(",").map((t) => t.trim()).filter(Boolean)) {
        currentCard.tags.push(tag);
      }
    } else {
      currentCard.unknownProps.push({ title, value });
    }
  }

  return board;
}

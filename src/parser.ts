import type { Board, Card, Column } from "./types";

// Tolerance rules for the kanban .txt DSL:
// - Line endings: \r\n, \r, and \n all accepted.
// - `# ` sets the board title; the first one wins, later ones are ignored.
// - `## ` starts a column. `###` and deeper headings are not part of the DSL.
// - Cards accept `1.`, `1)`, `-`, and `*` markers. Numbers are discarded:
//   order in the file is the order on the board.
// - A list item indented by at least one space or tab is a description line
//   of the most recent card, whatever the indent depth.
// - Blank lines are skipped and do not detach a card from later descriptions.
// - Cards before the first `## ` and anything unrecognized are ignored.
//   The parser never throws.

const LIST_ITEM = /^([ \t]*)(?:\d+[.)]|[-*])[ \t]+(.*)$/;

export function parseBoard(text: string): Board {
  const board: Board = { title: null, columns: [] };
  let currentColumn: Column | null = null;
  let currentCard: Card | null = null;

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

    const item = LIST_ITEM.exec(line);
    if (!item) continue;
    const [, indent, content] = item;

    if (indent === "") {
      if (!currentColumn) continue;
      currentCard = { id: crypto.randomUUID(), title: content, description: [] };
      currentColumn.cards.push(currentCard);
    } else {
      currentCard?.description.push(content);
    }
  }

  return board;
}

import type { Board } from "./types";
import { ABOUT_SECTION, SETTINGS_SECTION, isArchiveColumn } from "./boardOps";

// Canonical output format: `# Title` (omitted when null), one `## Name` block
// per column (plus the reserved `## About Cranban` and `## Settings` sections,
// written after the active columns), cards renumbered 1., 2., ... Each card's
// properties follow as
// `- Title: value` items indented to the card's content column (3 spaces
// under `1. `, 4 under `10. ` — the same alignment markdown formatters use),
// in a fixed order: a single `Description:` item, a `Date:` line, a single
// `Tags:` line, then any preserved unknown properties. A multi-line
// description continues on lines nested past the `- Description: ` content
// column, each keeping its own relative indentation, so nested markdown lists
// survive. Blocks are separated by a single blank line and the file ends with
// one newline.
// Round-trip guarantee: parseBoard(serializeBoard(b)) equals b modulo ids.

export function serializeBoard(board: Board): string {
  const blocks: string[] = [];

  if (board.title !== null) blocks.push(`# ${board.title}`);

  // About and Settings sit after the active columns and before the archive,
  // so the board itself stays at the top of the file.
  let extrasWritten = board.settings.length === 0 && board.about.length === 0;
  const writeExtras = () => {
    if (board.about.length > 0) {
      blocks.push(`## ${ABOUT_SECTION}`);
      blocks.push(board.about.join("\n"));
    }
    if (board.settings.length > 0) {
      blocks.push(`## ${SETTINGS_SECTION}`);
      blocks.push(board.settings.map((s) => `- ${s.title}: ${s.value}`).join("\n"));
    }
    extrasWritten = true;
  };

  for (const column of board.columns) {
    if (!extrasWritten && isArchiveColumn(column)) writeExtras();
    blocks.push(`## ${column.name}`);
    const cardLines = column.cards.map((card, i) => {
      const marker = `${i + 1}. `;
      const pad = " ".repeat(marker.length);
      const lines = [`${marker}${card.title}`];
      if (card.description !== "") {
        const [first, ...rest] = card.description.split("\n");
        lines.push(`${pad}- Description: ${first}`);
        for (const cont of rest) lines.push(`${pad}  ${cont}`);
      }
      if (card.date !== null) lines.push(`${pad}- Date: ${card.date}`);
      if (card.tags.length > 0) lines.push(`${pad}- Tags: ${card.tags.join(", ")}`);
      for (const prop of card.unknownProps) lines.push(`${pad}- ${prop.title}: ${prop.value}`);
      return lines.join("\n");
    });
    if (cardLines.length > 0) blocks.push(cardLines.join("\n"));
  }
  if (!extrasWritten) writeExtras();

  return blocks.join("\n\n") + "\n";
}

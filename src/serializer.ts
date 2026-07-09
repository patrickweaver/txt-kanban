import type { Board } from "./types";

// Canonical output format: `# Title` (omitted when null), one `## Name` block
// per column, cards renumbered 1., 2., ... Each card's properties follow as
// 4-space-indented `- Title: value` items in a fixed order: description lines,
// then a single `Tags:` line, then any preserved unknown properties. Blocks are
// separated by a single blank line and the file ends with one newline.
// Round-trip guarantee: parseBoard(serializeBoard(b)) equals b modulo ids.

export function serializeBoard(board: Board): string {
  const blocks: string[] = [];

  if (board.title !== null) blocks.push(`# ${board.title}`);

  for (const column of board.columns) {
    blocks.push(`## ${column.name}`);
    const cardLines = column.cards.map((card, i) => {
      const lines = [`${i + 1}. ${card.title}`];
      for (const line of card.description) lines.push(`    - Description: ${line}`);
      if (card.tags.length > 0) lines.push(`    - Tags: ${card.tags.join(", ")}`);
      for (const prop of card.unknownProps) lines.push(`    - ${prop.title}: ${prop.value}`);
      return lines.join("\n");
    });
    if (cardLines.length > 0) blocks.push(cardLines.join("\n"));
  }

  return blocks.join("\n\n") + "\n";
}

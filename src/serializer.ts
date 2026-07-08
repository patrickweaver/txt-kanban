import type { Board } from "./types";

// Canonical output format: `# Title` (omitted when null), one `## Name` block
// per column, cards renumbered 1., 2., ... with description lines as
// 4-space-indented numbered items directly under their card. Blocks are
// separated by a single blank line and the file ends with one newline.
// Round-trip guarantee: parseBoard(serializeBoard(b)) equals b modulo ids.

export function serializeBoard(board: Board): string {
  const blocks: string[] = [];

  if (board.title !== null) blocks.push(`# ${board.title}`);

  for (const column of board.columns) {
    blocks.push(`## ${column.name}`);
    const cardLines = column.cards.map((card, i) =>
      [
        `${i + 1}. ${card.title}`,
        ...card.description.map((line, j) => `    ${j + 1}. ${line}`),
      ].join("\n")
    );
    if (cardLines.length > 0) blocks.push(cardLines.join("\n"));
  }

  return blocks.join("\n\n") + "\n";
}

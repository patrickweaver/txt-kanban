import type { Board, Card, Column } from "./types";

// Pure Board -> Board operations. Each returns a new board; untouched
// columns and cards are shared, not cloned.

export function findCard(board: Board, cardId: string): Card | null {
  for (const column of board.columns) {
    const card = column.cards.find((c) => c.id === cardId);
    if (card) return card;
  }
  return null;
}

export function findColumnOfCard(board: Board, cardId: string): Column | null {
  return board.columns.find((col) => col.cards.some((c) => c.id === cardId)) ?? null;
}

function mapCard(board: Board, cardId: string, fn: (card: Card) => Card): Board {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.cards.some((c) => c.id === cardId)
        ? { ...col, cards: col.cards.map((c) => (c.id === cardId ? fn(c) : c)) }
        : col
    ),
  };
}

export function updateCardTitle(board: Board, cardId: string, title: string): Board {
  return mapCard(board, cardId, (card) => ({ ...card, title }));
}

/** Replaces the description line at `index` with `lines`; empty `lines` deletes it. */
export function updateDescriptionLine(
  board: Board,
  cardId: string,
  index: number,
  lines: string[]
): Board {
  return mapCard(board, cardId, (card) => {
    const description = [...card.description];
    description.splice(index, 1, ...lines);
    return { ...card, description };
  });
}

export function addDescriptionLines(board: Board, cardId: string, lines: string[]): Board {
  return mapCard(board, cardId, (card) => ({
    ...card,
    description: [...card.description, ...lines],
  }));
}

export function addTag(board: Board, cardId: string, tag: string): Board {
  const value = tag.trim();
  if (value === "") return board;
  return mapCard(board, cardId, (card) => ({ ...card, tags: [...card.tags, value] }));
}

export function updateTag(board: Board, cardId: string, index: number, tag: string): Board {
  const value = tag.trim();
  if (value === "") return board;
  return mapCard(board, cardId, (card) => {
    if (index < 0 || index >= card.tags.length) return card;
    const tags = [...card.tags];
    tags[index] = value;
    return { ...card, tags };
  });
}

export function removeTag(board: Board, cardId: string, index: number): Board {
  return mapCard(board, cardId, (card) => {
    if (index < 0 || index >= card.tags.length) return card;
    return { ...card, tags: card.tags.filter((_, i) => i !== index) };
  });
}

export function addCard(board: Board, columnId: string, card: Card): Board {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    ),
  };
}

/** Moves a card into `columnId` at `index` (clamped; -1 appends). */
export function moveCardToColumn(
  board: Board,
  cardId: string,
  columnId: string,
  index: number
): Board {
  const card = findCard(board, cardId);
  if (!card) return board;
  return {
    ...board,
    columns: board.columns.map((col) => {
      const without = col.cards.filter((c) => c.id !== cardId);
      if (col.id !== columnId) {
        return without.length === col.cards.length ? col : { ...col, cards: without };
      }
      const at = index < 0 ? without.length : Math.min(index, without.length);
      return { ...col, cards: [...without.slice(0, at), card, ...without.slice(at)] };
    }),
  };
}

export function reorderCard(board: Board, cardId: string, toIndex: number): Board {
  const column = findColumnOfCard(board, cardId);
  if (!column) return board;
  return moveCardToColumn(board, cardId, column.id, toIndex);
}

// --- Archive ("Archived" column) ---

const DELETED_AT_RE = /\s*\(deleted (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\)\s*$/;

/**
 * The archive column holds removed cards and is hidden from the board view.
 * New columns are created as "Archived"; "Deleted" is still recognized for
 * files written before the rename.
 */
export function isArchiveColumn(column: Column): boolean {
  const name = column.name.trim().toLowerCase();
  return name === "archived" || name === "deleted";
}

export function formatDeletedAt(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(
    date.getHours()
  )}:${p(date.getMinutes())}`;
}

/** Epoch ms of the card's deleted-at title suffix; 0 when absent/unparseable. */
export function deletedAtOf(card: Card): number {
  const match = DELETED_AT_RE.exec(card.title);
  if (!match) return 0;
  const parsed = Date.parse(match[1].replace(" ", "T"));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Moves a card to the "Archived" column (created at the end of the board if
 * missing), appending a deleted-at timestamp to its title.
 */
export function archiveCard(board: Board, cardId: string, deletedAt: string): Board {
  const card = findCard(board, cardId);
  if (!card) return board;
  const archived: Card = { ...card, title: `${card.title} (deleted ${deletedAt})` };
  const columns = board.columns.map((col) =>
    col.cards.some((c) => c.id === cardId)
      ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
      : col
  );
  const archiveColumn = columns.find(isArchiveColumn);
  if (!archiveColumn) {
    return {
      ...board,
      columns: [...columns, { id: crypto.randomUUID(), name: "Archived", cards: [archived] }],
    };
  }
  return {
    ...board,
    columns: columns.map((col) =>
      col === archiveColumn ? { ...col, cards: [...col.cards, archived] } : col
    ),
  };
}

/**
 * Moves an archived card back to the first non-archive column, stripping the
 * deleted-at suffix from its title.
 */
export function restoreCard(board: Board, cardId: string): Board {
  const card = findCard(board, cardId);
  const from = findColumnOfCard(board, cardId);
  const target = board.columns.find((col) => !isArchiveColumn(col));
  if (!card || !from || !isArchiveColumn(from) || !target) return board;
  const restored: Card = { ...card, title: card.title.replace(DELETED_AT_RE, "") };
  return {
    ...board,
    columns: board.columns.map((col) => {
      if (col.id === from.id) return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
      if (col.id === target.id) return { ...col, cards: [...col.cards, restored] };
      return col;
    }),
  };
}

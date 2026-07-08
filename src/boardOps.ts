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

/** Replaces the description line at `index`; an empty `text` deletes the line. */
export function updateDescriptionLine(
  board: Board,
  cardId: string,
  index: number,
  text: string
): Board {
  return mapCard(board, cardId, (card) => {
    const description = [...card.description];
    if (text === "") description.splice(index, 1);
    else description[index] = text;
    return { ...card, description };
  });
}

export function addDescriptionLine(board: Board, cardId: string, text: string): Board {
  return mapCard(board, cardId, (card) => ({
    ...card,
    description: [...card.description, text],
  }));
}

export function addCard(board: Board, columnId: string, card: Card): Board {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    ),
  };
}

export function deleteCard(board: Board, cardId: string): Board {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.cards.some((c) => c.id === cardId)
        ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
        : col
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

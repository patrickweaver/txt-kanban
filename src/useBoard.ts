import { useRef, useState } from "react";
import type { Board } from "./types";

export interface BoardState {
  board: Board | null;
  /** Always the latest board, safe to read from rapidly-firing handlers. */
  boardRef: React.RefObject<Board | null>;
  load(board: Board): void;
  /** Applies a pure mutation and returns the next board so callers can save it. */
  apply(fn: (board: Board) => Board): Board;
  /** Replaces the whole board (drag-cancel restore). */
  restore(board: Board): void;
}

export function useBoard(): BoardState {
  const [board, setBoard] = useState<Board | null>(null);
  const boardRef = useRef<Board | null>(null);

  function load(next: Board): void {
    boardRef.current = next;
    setBoard(next);
  }

  function apply(fn: (board: Board) => Board): Board {
    const current = boardRef.current;
    if (!current) throw new Error("No board loaded");
    const next = fn(current);
    boardRef.current = next;
    setBoard(next);
    return next;
  }

  return { board, boardRef, load, apply, restore: load };
}

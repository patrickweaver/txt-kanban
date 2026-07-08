export interface Card {
  /** Runtime-only identity for React keys and drag-and-drop; never serialized. */
  id: string;
  title: string;
  /** One entry per nested list item; empty array = no description. */
  description: string[];
}

export interface Column {
  /** Runtime-only identity; never serialized. */
  id: string;
  name: string;
  cards: Card[];
}

export interface Board {
  /** From the `# ` line; null if the file has none. */
  title: string | null;
  columns: Column[];
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface UnknownProperty {
  /** Title as written in the file (original casing), for display and round-trip. */
  title: string;
  value: string;
}

export interface Card {
  /** Runtime-only identity for React keys and drag-and-drop; never serialized. */
  id: string;
  title: string;
  /** One entry per `- Description:` line; empty array = no description. */
  description: string[];
  /** Raw `- Date:` value, preserved verbatim for round-trip; null = none. */
  date: string | null;
  /** Flattened from `- Tags:` lines (comma-separated); empty array = none. */
  tags: string[];
  /** `- Title: value` lines whose title isn't a known property. Preserved on
   *  save (never silently dropped) and surfaced as errors in the UI. */
  unknownProps: UnknownProperty[];
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

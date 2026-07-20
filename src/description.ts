// A description is stored in the file as a single `- Description:` line. A
// real newline would end the list item, so newlines are written as the
// two-character sequence `\n` — and backslashes as `\\`, so text that
// literally contains `\n` still round-trips.

export function encodeDescription(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

/** Inverse of encodeDescription. Unknown escapes (e.g. `\t`) pass through. */
export function decodeDescription(text: string): string {
  return text.replace(/\\([\\n])/g, (_, c: string) => (c === "n" ? "\n" : "\\"));
}

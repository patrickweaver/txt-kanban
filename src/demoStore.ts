// The demo board has no file behind it, so its text lives in localStorage:
// edits survive a refresh and a trip back to the start screen, but never leave
// this browser. Everything else about the board is normal — it is the same
// serialized text that would have been written to disk.

const DEMO_STORAGE_KEY = "cranban.demo";

/** null when the demo has never been opened, or storage is unreadable. */
export function readStoredDemo(): string | null {
  try {
    return localStorage.getItem(DEMO_STORAGE_KEY);
  } catch {
    // Storage can throw when disabled (private mode, blocked cookies).
    return null;
  }
}

export function writeStoredDemo(text: string): void {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, text);
  } catch {
    // The demo still works for this page load; it just won't be remembered.
  }
}

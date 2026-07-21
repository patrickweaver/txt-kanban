/**
 * Selectable color themes. Each id has a matching `:root[data-theme="<id>"]`
 * block in index.css; App sets the attribute from state.
 */
export const THEMES = [
  // "Default Cranberry" was the old label, kept as an alias so files written
  // or hand-edited before the local default existed still resolve.
  { id: "cranberry", label: "Cranberry", aliases: ["Default Cranberry"] },
  { id: "boring", label: "Boring", aliases: [] },
  { id: "dark-boring", label: "Dark Boring", aliases: [] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

/** Used until the browser has a stored preference. */
export const DEFAULT_THEME: ThemeId = "cranberry";

/** Also read by the pre-paint script in index.html; keep the two in sync. */
export const THEME_STORAGE_KEY = "kanban.theme";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, "");

/**
 * Reads a theme from a hand-editable value, accepting the id ("dark-boring"),
 * the label ("Dark Boring"), or a legacy alias, ignoring case, spaces, and
 * separators. null when it matches no theme.
 */
export function resolveThemeId(value: string): ThemeId | null {
  const key = normalize(value);
  const match = THEMES.find(
    (theme) =>
      normalize(theme.id) === key ||
      normalize(theme.label) === key ||
      theme.aliases.some((alias) => normalize(alias) === key)
  );
  return match ? match.id : null;
}

/** The browser-local default. null when unset or unreadable. */
export function readStoredTheme(): ThemeId | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored ? resolveThemeId(stored) : null;
  } catch {
    // Storage can throw when disabled (private mode, blocked cookies).
    return null;
  }
}

export function writeStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not being able to remember the preference shouldn't break theming.
  }
}

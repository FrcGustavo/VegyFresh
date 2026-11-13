export type ColumnWidths = Record<string, number>;

export function readColumnWidths(storageKey: string): ColumnWidths | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed: unknown = JSON.parse(stored);
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed) ||
      !Object.values(parsed).every(
        (width) => typeof width === "number" && Number.isFinite(width),
      )
    ) {
      return null;
    }
    return parsed as ColumnWidths;
  } catch {
    return null;
  }
}

export function writeColumnWidths(storageKey: string, widths: ColumnWidths): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // Keep resizing usable when storage is unavailable or full.
  }
}

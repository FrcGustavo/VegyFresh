import { useState, useMemo } from "react";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function useSearch<T extends Record<string, unknown>>(
  items: T[],
  fields: (keyof T | string)[],
) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      fields.some((field) => {
        const parts = (field as string).split(".");
        let value: unknown = item;
        for (const part of parts) {
          if (!isRecord(value)) {
            value = undefined;
            break;
          }
          value = value[part];
        }
        return String(value ?? "")
          .toLowerCase()
          .includes(q);
      }),
    );
  }, [items, query, fields]);

  return { query, setQuery, filtered };
}

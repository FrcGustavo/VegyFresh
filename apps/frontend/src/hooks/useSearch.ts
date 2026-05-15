import { useState, useMemo } from 'react';

export function useSearch<T extends Record<string, any>>(items: T[], fields: (keyof T | string)[]) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      fields.some((field) => {
        const parts = (field as string).split('.');
        let value: any = item;
        for (const part of parts) value = value?.[part];
        return String(value ?? '').toLowerCase().includes(q);
      })
    );
  }, [items, query, fields]);

  return { query, setQuery, filtered };
}

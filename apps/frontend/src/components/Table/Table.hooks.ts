import { useCallback, useState } from "react";

interface ResizeState {
  [columnKey: string]: number;
}

export const useTableResizableColumns = (
  storageKey: string,
  columns: Array<{ key: string; defaultWidth: number }>,
) => {
  const [columnWidths, setColumnWidths] = useState<ResizeState>(() => {
    if (typeof window === "undefined") {
      return columns.reduce(
        (acc, col) => {
          acc[col.key] = col.defaultWidth;
          return acc;
        },
        {} as ResizeState,
      );
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Continue with defaults
    }

    return columns.reduce(
      (acc, col) => {
        acc[col.key] = col.defaultWidth;
        return acc;
      },
      {} as ResizeState,
    );
  });

  const getColumnWidth = useCallback(
    (columnKey: string) => columnWidths[columnKey] || 160,
    [columnWidths],
  );

  const updateColumnWidth = useCallback(
    (columnKey: string, width: number) => {
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnKey]: width };
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    },
    [storageKey],
  );

  const resetColumnWidth = useCallback(
    (columnKey: string, defaultWidth: number) => {
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnKey]: defaultWidth };
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    },
    [storageKey],
  );

  return {
    columnWidths,
    getColumnWidth,
    updateColumnWidth,
    resetColumnWidth,
  };
};

export const useTableSelection = () => {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleRowSelect = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  return {
    selectedRowId,
    handleRowSelect,
    clearSelection,
  };
};

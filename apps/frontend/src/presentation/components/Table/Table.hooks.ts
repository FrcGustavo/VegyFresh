import { useCallback, useEffect, useState } from "react";
import {
  readColumnWidths,
  writeColumnWidths,
} from "@/infrastructure/preferences/columnWidthsStorage";

interface ResizeState {
  [columnKey: string]: number;
}

export const useTableResizableColumns = (
  storageKey: string,
  columns: ReadonlyArray<{ key: string; defaultWidth: number }>,
) => {
  const [columnWidths, setColumnWidths] = useState<ResizeState>(() =>
    Object.fromEntries(columns.map((col) => [col.key, col.defaultWidth])),
  );

  useEffect(() => {
    const stored = readColumnWidths(storageKey);
    if (stored) {
      // Loading after hydration keeps the first client render equal to the server.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColumnWidths(stored);
    }
  }, [storageKey]);

  const getColumnWidth = useCallback(
    (columnKey: string) => columnWidths[columnKey] || 160,
    [columnWidths],
  );

  const updateColumnWidth = useCallback(
    (columnKey: string, width: number) => {
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnKey]: width };
        writeColumnWidths(storageKey, updated);
        return updated;
      });
    },
    [storageKey],
  );

  const resetColumnWidth = useCallback(
    (columnKey: string, defaultWidth: number) => {
      setColumnWidths((prev) => {
        const updated = { ...prev, [columnKey]: defaultWidth };
        writeColumnWidths(storageKey, updated);
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

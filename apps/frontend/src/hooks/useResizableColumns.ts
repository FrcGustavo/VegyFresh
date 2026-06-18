import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

interface ColumnDefinition {
  key: string;
  minWidth?: number;
  defaultWidth?: number;
}

interface ResizeState {
  key: string;
  startX: number;
  startWidth: number;
}

const STORAGE_PREFIX = "vegyfresh-table-widths:";

const clamp = (value: number, min: number) => Math.max(min, value);

export function useResizableColumns(
  tableId: string,
  columns: readonly ColumnDefinition[],
) {
  const storageKey = `${STORAGE_PREFIX}${tableId}`;
  const columnMap = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns],
  );

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const fromDefaults = Object.fromEntries(
      columns
        .filter((column) => column.defaultWidth !== undefined)
        .map((column) => [column.key, Number(column.defaultWidth)]),
    );

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return fromDefaults;
      const parsed = JSON.parse(raw) as Record<string, number>;
      return { ...fromDefaults, ...parsed };
    } catch {
      return fromDefaults;
    }
  });

  const resizeRef = useRef<ResizeState | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(widths));
  }, [storageKey, widths]);

  const stopResizing = useCallback(() => {
    resizeRef.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      const resize = resizeRef.current;
      if (!resize) return;

      const column = columnMap.get(resize.key);
      if (!column) return;

      const deltaX = event.clientX - resize.startX;
      const nextWidth = clamp(
        resize.startWidth + deltaX,
        column.minWidth ?? 80,
      );

      setWidths((previous) => {
        if (previous[resize.key] === nextWidth) {
          return previous;
        }
        return { ...previous, [resize.key]: nextWidth };
      });
    },
    [columnMap],
  );

  useEffect(() => {
    const onMouseUp = () => stopResizing();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, stopResizing]);

  const startResizing = useCallback(
    (columnKey: string, event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const column = columnMap.get(columnKey);
      if (!column) return;

      const currentWidth =
        widths[columnKey] ?? column.defaultWidth ?? column.minWidth ?? 120;
      resizeRef.current = {
        key: columnKey,
        startX: event.clientX,
        startWidth: currentWidth,
      };

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [columnMap, widths],
  );

  const resetColumnWidth = useCallback(
    (columnKey: string) => {
      const column = columnMap.get(columnKey);
      if (!column) return;

      setWidths((previous) => {
        const next = { ...previous };
        if (column.defaultWidth === undefined) {
          delete next[columnKey];
          return next;
        }
        next[columnKey] = column.defaultWidth;
        return next;
      });
    },
    [columnMap],
  );

  const getColumnCellSx = useCallback(
    (columnKey: string) => {
      const column = columnMap.get(columnKey);
      const width = widths[columnKey];
      const minWidth = column?.minWidth ?? 80;
      if (width === undefined) {
        return { minWidth };
      }
      return {
        width,
        minWidth,
        maxWidth: width,
      };
    },
    [columnMap, widths],
  );

  return {
    startResizing,
    resetColumnWidth,
    getColumnCellSx,
  };
}

import type { MouseEvent as ReactMouseEvent } from "react";

export interface ResizableHeaderCellProps {
  label: string;
  columnKey: string;
  cellSx: object;
  onResizeStart: (columnKey: string, event: ReactMouseEvent) => void;
  onResetWidth: (columnKey: string) => void;
  sortable?: boolean;
  sortActive?: boolean;
  sortDirection?: "asc" | "desc";
  onSort?: (columnKey: string) => void;
}

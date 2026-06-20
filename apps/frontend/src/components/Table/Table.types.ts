import type { SxProps, Theme } from "@mui/material/styles";

export type SortOrder = "asc" | "desc";

export interface ColumnConfig {
  key: string;
  label: string;
  minWidth: number;
  defaultWidth: number;
  sortable?: boolean;
}

export interface TableProps<T extends object> {
  columns: readonly ColumnConfig[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (columnKey: string) => void;
  selectedRowId?: string | null;
  onRowSelect?: (rowId: string) => void;
  onRowDoubleClick?: (rowId: string, item: T) => void;
  renderCell: (column: ColumnConfig, item: T) => React.ReactNode;
  resizableColumnsStorageKey?: string;
  containerMaxHeight?: string;
}

export interface TableHeaderCellProps {
  label: string;
  sortable?: boolean;
  sortActive?: boolean;
  sortDirection?: SortOrder;
  onSort?: () => void;
  onResizeStart?: (columnKey: string, startX: number) => void;
  onResetWidth?: (columnKey: string) => void;
  columnKey: string;
  cellSx?: SxProps<Theme>;
}

import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  CircularProgress,
} from "@mui/material";
import type { MouseEvent as ReactMouseEvent } from "react";
import ResizableHeaderCell from "../ResizableHeaderCell";
import { tableStyles } from "./Table.styles";
import {
  useTableResizableColumns,
  useTableSelection,
} from "./Table.hooks";
import type { TableProps } from "./Table.types";

export function Table<T extends object>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = "No hay registros",
  sortBy,
  sortOrder,
  onSort,
  selectedRowId,
  onRowSelect,
  onRowDoubleClick,
  renderCell,
  resizableColumnsStorageKey = "table-column-widths",
  containerMaxHeight = "calc(100vh - 116px)",
}: TableProps<T>) {
  const resizeState = useTableResizableColumns(
    resizableColumnsStorageKey,
    columns,
  );
  const { handleRowSelect } = useTableSelection();

  const activeSelectedRowId = selectedRowId || null;

  const handleRowSelectClick = (rowId: string) => {
    handleRowSelect(rowId);
    onRowSelect?.(rowId);
  };

  const handleRowDoubleClick = (rowId: string, item: T) => {
    handleRowSelectClick(rowId);
    onRowDoubleClick?.(rowId, item);
  };

  const handleSort = (columnKey: string) => {
    onSort?.(columnKey);
  };

  const handleResizeStart = (columnKey: string, event: ReactMouseEvent) => {
    const startX = event.clientX;

    const resizer = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const currentWidth = resizeState.getColumnWidth(columnKey);
      const newWidth = Math.max(50, currentWidth + diff);
      resizeState.updateColumnWidth(columnKey, newWidth);
    };

    const stopResizing = () => {
      document.removeEventListener("mousemove", resizer);
      document.removeEventListener("mouseup", stopResizing);
    };

    document.addEventListener("mousemove", resizer);
    document.addEventListener("mouseup", stopResizing);
  };

  const handleResetWidth = (columnKey: string) => {
    const column = columns.find((col) => col.key === columnKey);
    if (column) {
      resizeState.resetColumnWidth(columnKey, column.defaultWidth);
    }
  };

  if (isLoading) {
    return (
      <Box sx={tableStyles.loadingContainer}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer sx={{ ...tableStyles.container, maxHeight: containerMaxHeight }}>
      <MuiTable sx={tableStyles.table}>
        <TableHead sx={tableStyles.tableHead}>
          <TableRow>
            {columns.map((column) => (
              <ResizableHeaderCell
                key={column.key}
                label={column.label}
                columnKey={column.key}
                cellSx={tableStyles.headerCell(
                  resizeState.getColumnWidth(column.key),
                  column.minWidth,
                )}
                onResizeStart={handleResizeStart}
                onResetWidth={handleResetWidth}
                sortable={column.sortable}
                sortActive={sortBy === column.key}
                sortDirection={sortOrder}
                onSort={() => handleSort(column.key)}
              />
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={tableStyles.emptyCell}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const rowId = String(keyExtractor(item));
              return (
                <TableRow
                  key={rowId}
                  hover
                  selected={activeSelectedRowId === rowId}
                  onClick={() => handleRowSelectClick(rowId)}
                  onDoubleClick={() => handleRowDoubleClick(rowId, item)}
                  sx={tableStyles.tableRow}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`${rowId}-${column.key}`}
                      sx={tableStyles.columnCell(
                        resizeState.getColumnWidth(column.key),
                        column.minWidth,
                      )}
                    >
                      {renderCell(column, item)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
}

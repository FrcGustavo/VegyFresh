import { Box, TableCell, TableSortLabel } from "@mui/material";
import { resizableHeaderCellStyles } from "./ResizableHeaderCell.styles";
import type { ResizableHeaderCellProps } from "./ResizableHeaderCell.types";

export default function ResizableHeaderCell({
  label,
  columnKey,
  cellSx,
  onResizeStart,
  onResetWidth,
  sortable = false,
  sortActive = false,
  sortDirection = "asc",
  onSort,
}: ResizableHeaderCellProps) {
  return (
    <TableCell
      sx={{ ...cellSx, ...resizableHeaderCellStyles.cell }}
    >
      {sortable ? (
        <TableSortLabel
          active={sortActive}
          direction={sortDirection}
          onClick={() => onSort?.(columnKey)}
          sx={resizableHeaderCellStyles.sortLabel}
        >
          {label}
        </TableSortLabel>
      ) : (
        label
      )}
      <Box
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(event) => onResizeStart(columnKey, event)}
        onDoubleClick={() => onResetWidth(columnKey)}
        sx={resizableHeaderCellStyles.resizer}
      />
    </TableCell>
  );
}

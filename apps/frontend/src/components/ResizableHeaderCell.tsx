import { Box, TableCell } from '@mui/material';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface ResizableHeaderCellProps {
  label: string;
  columnKey: string;
  cellSx: object;
  onResizeStart: (columnKey: string, event: ReactMouseEvent) => void;
  onResetWidth: (columnKey: string) => void;
}

export default function ResizableHeaderCell({
  label,
  columnKey,
  cellSx,
  onResizeStart,
  onResetWidth,
}: ResizableHeaderCellProps) {
  return (
    <TableCell
      sx={{
        ...cellSx,
        position: 'relative',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      <Box
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(event) => onResizeStart(columnKey, event)}
        onDoubleClick={() => onResetWidth(columnKey)}
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '0.75rem',
          height: '100%',
          cursor: 'col-resize',
          '&::after': {
            content: '""',
            position: 'absolute',
            right: '0.25rem',
            top: '20%',
            bottom: '20%',
            width: '1px',
            backgroundColor: 'divider',
          },
        }}
      />
    </TableCell>
  );
}

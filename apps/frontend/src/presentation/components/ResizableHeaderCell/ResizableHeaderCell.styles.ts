export const resizableHeaderCellStyles = {
  cell: {
    position: "relative",
    userSelect: "none",
    whiteSpace: "nowrap",
  },
  sortLabel: {
    pr: 1.5,
    color: "inherit",
    "&.MuiTableSortLabel-root": {
      color: "inherit",
    },
    "&.MuiTableSortLabel-root:hover": {
      color: "inherit",
    },
    "& .MuiTableSortLabel-icon": {
      color: "inherit !important",
    },
  },
  resizer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "0.75rem",
    height: "100%",
    cursor: "col-resize",
    "&::after": {
      content: '""',
      position: "absolute",
      right: "0.25rem",
      top: "20%",
      bottom: "20%",
      width: "1px",
      backgroundColor: "divider",
    },
  },
};

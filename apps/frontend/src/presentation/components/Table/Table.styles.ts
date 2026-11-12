export const tableStyles = {
  container: {
    maxHeight: "calc(100vh - 116px)",
    overflow: "auto",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    py: 4,
  },
  table: {
    border: "1px solid",
    borderColor: "divider",
    borderLeft: 0,
    borderTop: 0,
    width: "max-content",
    tableLayout: "fixed",
  },
  tableHead: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    bgcolor: "primary.dark",
  },
  tableRow: {
    cursor: "pointer",
    "&.Mui-selected": { backgroundColor: "action.selected" },
    "&.Mui-selected:hover": {
      backgroundColor: "action.selected",
    },
  },
  tableCell: {
    border: "1px solid",
    borderColor: "divider",
  },
  columnCell: (width: number, minWidth: number) => ({
    border: "1px solid",
    borderColor: "divider",
    width,
    minWidth,
  }),
  headerCell: (width: number, minWidth: number) => ({
    width,
    minWidth,
  }),
  emptyCell: {
    textAlign: "center",
    padding: "2rem",
    border: "1px solid",
    borderColor: "divider",
  },
};

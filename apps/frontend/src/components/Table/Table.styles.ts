export const tableStyles = {
  container: {
    maxHeight: "calc(100vh - 116px)",
    overflow: "auto",
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
    padding: "0 !important",
    border: "1px solid",
    borderColor: "divider",
  },
  emptyCell: {
    textAlign: "center",
    padding: "2rem",
    border: "1px solid",
    borderColor: "divider",
  },
};

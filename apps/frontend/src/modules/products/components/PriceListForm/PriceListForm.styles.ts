export const priceListFormStyles = {
  root: {
    p: 3,
    height: "100%",
  },
  form: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  } as const,
  nameFieldContainer: {
    mb: 3,
  },
  tableSection: {
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    flex: 1,
  },
  tableContainer: {
    mb: 2,
    minHeight: 0,
    flex: 1,
    overflow: "auto",
  },
  table: {
    border: "1px solid",
    borderColor: "divider",
  },
  tableHead: {
    bgcolor: "primary.dark",
    "& .MuiTableCell-root": {
      color: "primary.contrastText",
      fontWeight: 600,
      bgcolor: "primary.dark",
    },
  },
  cell: {
    "&.MuiTableCell-root": {
      padding: "0 !important",
      border: "1px solid",
      borderColor: "divider",
    },
  },
  headerCell: (width: string) => ({
    ...priceListFormStyles.cell,
    width,
  }),
  cellInput: {
    margin: 0,
    "& .MuiInputBase-input": { p: 0 },
    "& .MuiInput-underline:before": { borderBottom: "none" },
    "& .MuiInput-underline:after": { borderBottom: "none" },
    "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
      borderBottom: "none",
    },
  },
  actionCell: {
    textAlign: "center",
  },
  deleteActionButton: {
    m: 0,
    p: 1,
  },
};

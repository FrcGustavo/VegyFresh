export const orderFormStyles = {
  root: {
    p: 3,
    height: "100%",
  },
  form: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  } as const,
  headerGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
    columnGap: 2,
    mb: 3,
  },
  columnStack: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
  },
  datesGrid: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
    gap: 2,
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
    ...orderFormStyles.cell,
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
  summaryBar: {
    mt: "auto",
    pt: 2,
    borderTop: "1px solid",
    borderColor: "divider",
    position: "sticky",
    bottom: 0,
    bgcolor: "background.paper",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
  },
};

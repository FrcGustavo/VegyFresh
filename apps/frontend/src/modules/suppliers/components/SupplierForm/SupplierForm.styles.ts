export const supplierFormStyles = {
  root: {
    p: 3,
    maxWidth: 900,
  },
  layout: {
    display: "flex",
    gap: 3,
    alignItems: "flex-start",
    flexWrap: { xs: "wrap", md: "nowrap" },
  },
  logoColumn: {
    width: { xs: "100%", md: 220 },
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  logoAvatar: {
    width: 150,
    height: 150,
  },
  logoButton: {
    width: "100%",
  },
  fieldsColumn: {
    flex: 1,
    minWidth: 320,
  },
};

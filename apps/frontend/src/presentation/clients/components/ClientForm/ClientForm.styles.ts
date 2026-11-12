export const clientFormStyles = {
  root: {
    display: "block",
  },
  generalLayout: {
    display: "flex",
    gap: 3,
    alignItems: "flex-start",
    flexWrap: { xs: "wrap", md: "nowrap" },
  },
  avatarColumn: {
    width: { xs: "100%", md: 220 },
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  avatar: {
    width: 150,
    height: 150,
  },
  avatarButton: {
    width: "100%",
  },
  generalFields: {
    flex: 1,
  },
  addressSection: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  locationGrid: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      md: "repeat(3, minmax(0, 1fr))",
    },
    gap: 2,
  },
  addressGrid: {
    display: "grid",
    gridTemplateColumns: {
      xs: "1fr",
      sm: "repeat(3, minmax(0, 1fr))",
    },
    gap: 2,
  },
};

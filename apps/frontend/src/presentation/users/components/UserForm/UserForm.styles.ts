export const userFormStyles = {
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
  avatarError: {
    width: "100%",
  },
  fieldsColumn: {
    flex: 1,
    minWidth: 320,
  },
  noRolesAlert: {
    mt: 2,
  },
};

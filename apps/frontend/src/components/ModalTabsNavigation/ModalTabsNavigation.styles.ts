export const modalTabsNavigationStyles = {
  container: {
    borderBottom: 1,
    borderColor: "divider",
    flex: "0 0 auto",
  },
  tabs: {
    minHeight: "unset",
    maxHeight: "unset",
    height: "30px",
  },
  tab: (active: boolean) => ({
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    px: 1,
    py: 0,
    minWidth: "unset",
    maxWidth: "unset",
    minHeight: "unset",
    maxHeight: "unset",
    height: "30px",
    textTransform: "capitalize",
    ...(active
      ? {
          border: "1px solid",
          borderColor: "divider",
          borderBottom: "none",
          borderRadius: "4px 4px 0 0",
        }
      : {}),
  }),
};

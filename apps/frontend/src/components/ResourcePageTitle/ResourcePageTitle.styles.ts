export const resourcePageTitleStyles = {
  container: {
    px: 2,
    py: 1.5,
    position: "sticky",
    top: { xs: "56px", sm: "64px" },
    zIndex: (theme: { zIndex: { appBar: number } }) => theme.zIndex.appBar + 1,
    borderBottom: "1px solid",
    borderColor: "divider",
    backgroundColor: "background.default",
    display: "flex",
    alignItems: "center",
    gap: 1,
  },
  icon: {
    display: "flex",
    alignItems: "center",
    color: "text.secondary",
  },
};

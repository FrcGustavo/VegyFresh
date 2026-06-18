import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

interface ResourcePageTitleProps {
  title: string;
  icon: ReactNode;
}

export default function ResourcePageTitle({
  title,
  icon,
}: ResourcePageTitleProps) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        position: "sticky",
        top: { xs: "56px", sm: "64px" },
        zIndex: (theme) => theme.zIndex.appBar + 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.default",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box
        sx={{ display: "flex", alignItems: "center", color: "text.secondary" }}
      >
        {icon}
      </Box>
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
    </Box>
  );
}

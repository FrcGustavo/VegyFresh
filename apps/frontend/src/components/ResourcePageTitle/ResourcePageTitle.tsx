import { Box, Typography } from "@mui/material";
import { resourcePageTitleStyles } from "./ResourcePageTitle.styles";
import type { ResourcePageTitleProps } from "./ResourcePageTitle.types";

export default function ResourcePageTitle({
  title,
  icon,
}: ResourcePageTitleProps) {
  return (
    <Box
      sx={resourcePageTitleStyles.container}
    >
      <Box sx={resourcePageTitleStyles.icon}>
        {icon}
      </Box>
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
    </Box>
  );
}

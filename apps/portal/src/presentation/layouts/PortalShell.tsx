import { AppBar, Box, Stack, Toolbar, Typography } from "@mui/material";
import type { ReactNode } from "react";

export function PortalShell({ navigation, children }: { navigation: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <AppBar position="sticky">
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6">VegyFresh Customer Portal</Typography>
          <Stack direction="row" spacing={1}>{navigation}</Stack>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}

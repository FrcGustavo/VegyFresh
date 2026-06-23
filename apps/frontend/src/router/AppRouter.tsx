import { Box, CircularProgress } from "@mui/material";
import { Suspense } from "react";
import { BrowserRouter } from "react-router";
import { AppRoutes } from "./AppRoutes";

function RouteFallback() {
  return (
    <Box
      role="status"
      sx={{ display: "flex", justifyContent: "center", mt: 4 }}
    >
      <CircularProgress />
    </Box>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}

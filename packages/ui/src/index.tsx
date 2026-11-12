import * as React from "react";
import { Alert, Box, CircularProgress, Stack, Typography, createTheme } from "@mui/material";
import type { PaletteMode } from "@mui/material";

export const tokens = {
  color: { primary: "#2e7d32", secondary: "#ef6c00" },
  shape: { borderRadius: 8 },
} as const;

export function createVegyTheme(mode: PaletteMode = "light") {
  return createTheme({
    palette: { mode, primary: { main: tokens.color.primary }, secondary: { main: tokens.color.secondary } },
    shape: tokens.shape,
  });
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <Stack spacing={0.5} sx={{ mb: 2 }}>
    <Typography variant="h4">{title}</Typography>
    {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
  </Stack>;
}

export function ErrorState({ message }: { message: string }) {
  return <Box sx={{ py: 2 }}><Alert severity="error">{message}</Alert></Box>;
}

export function LoadingState({ label = "Cargando" }: { label?: string }) {
  return <Box role="status" aria-label={label} sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
    <CircularProgress aria-label={label} />
  </Box>;
}

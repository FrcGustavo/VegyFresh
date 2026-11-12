import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Box, Button, Container, CssBaseline, Paper, Stack, ThemeProvider, Typography } from "@mui/material";
import { ErrorState, LoadingState, PageHeader, createVegyTheme, tokens } from "@vegyfresh/ui";

function Catalogue() {
  const [dark, setDark] = useState(false);
  return <ThemeProvider theme={createVegyTheme(dark ? "dark" : "light")}><CssBaseline />
    <Container sx={{ py: 4 }}><Stack spacing={3}>
      <PageHeader title="VegyFresh UI" subtitle="Componentes y tokens compartidos por administrador y portal" />
      <Button onClick={() => setDark(!dark)}>Cambiar a tema {dark ? "claro" : "oscuro"}</Button>
      <Paper sx={{ p: 3 }}><PageHeader title="Encabezado de página" subtitle="Título y descripción opcional" /></Paper>
      <Paper sx={{ p: 3 }}><Typography variant="h6">Error</Typography><ErrorState message="No fue posible cargar los datos. Vuelve a intentarlo." /></Paper>
      <Paper sx={{ p: 3 }}><Typography variant="h6">Carga accesible</Typography><Box sx={{ "& > *": { minHeight: 160 } }}><LoadingState label="Cargando ejemplo" /></Box></Paper>
      <Paper sx={{ p: 3 }}><Typography variant="h6">Tokens</Typography><pre>{JSON.stringify(tokens, null, 2)}</pre></Paper>
    </Stack></Container>
  </ThemeProvider>;
}

createRoot(document.getElementById("root")!).render(<Catalogue />);

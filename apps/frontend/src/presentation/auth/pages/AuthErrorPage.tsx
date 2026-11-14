import { Button, Stack, Typography } from "@mui/material";
import { useLocation } from "@tanstack/react-router";

export function AuthErrorPage() {
  const params = new URLSearchParams(useLocation().searchStr);
  const messages: Record<string, string> = {
    access_denied: "Cancelaste el acceso en el proveedor de identidad.",
    account_conflict:
      "Esta cuenta ya está asociada a otro usuario de VegyFresh. Contacta al administrador para revisar el acceso.",
    profile_incomplete:
      "Tu perfil de Keycloak necesita incluir un correo válido. Actualiza tus datos e inténtalo de nuevo.",
    temporarily_unavailable:
      "El servicio no está disponible por el momento. Vuelve a intentarlo más tarde.",
  };
  const message =
    Object.entries(messages).find(([code]) => code === params.get("error"))?.[1] ??
    "No pudimos completar el acceso a tu cuenta. Si el problema continúa, contacta al administrador.";

  return <Stack spacing={2} sx={{ maxWidth: 480, mx: "auto", p: 4 }}>
    <Typography variant="h5">No fue posible iniciar sesión</Typography>
    <Typography role="alert">{message}</Typography>
    <Button variant="contained" href="/session/login">Volver a intentar</Button>
    <Button href="/login">Volver al inicio de sesión</Button>
  </Stack>;
}

import { Button, Stack, Typography } from "@mui/material";
import { useLocation } from "@tanstack/react-router";

export function AuthErrorPage() {
  const params = new URLSearchParams(useLocation().searchStr);
  const error = params.get("error");
  const needsEmailVerification = error === "email_verification_required";
  const messages: Record<string, string> = {
    access_denied: "Cancelaste el acceso en el proveedor de identidad.",
    account_conflict:
      "Esta cuenta ya está asociada a otro usuario de VegyFresh. Contacta al administrador para revisar el acceso.",
    profile_incomplete:
      "Faltan datos válidos en tu cuenta. Revisa tu perfil en el proveedor de identidad y vuelve a intentar.",
    temporarily_unavailable:
      "El servicio no está disponible por el momento. Vuelve a intentarlo más tarde.",
  };
  const message =
    Object.entries(messages).find(([code]) => code === error)?.[1] ??
    "No pudimos completar el acceso a tu cuenta. Si el problema continúa, contacta al administrador.";

  return (
    <Stack spacing={2} sx={{ maxWidth: 480, mx: "auto", p: 4 }}>
      <Typography component="h1" variant="h5">
        {needsEmailVerification ? "Verifica tu correo" : "No fue posible iniciar sesión"}
      </Typography>
      {needsEmailVerification ? (
        <>
          <Typography>
            Busca el mensaje de verificación en el correo con el que creaste tu
            cuenta y abre el enlace. Luego vuelve aquí e inicia sesión con la
            misma cuenta.
          </Typography>
          <Typography>
            Si no encuentras el mensaje, revisa la carpeta de correo no deseado.
          </Typography>
        </>
      ) : (
        <Typography role="alert">{message}</Typography>
      )}
      <Button variant="contained" href="/session/login">
        {needsEmailVerification ? "Ya verifiqué mi correo" : "Volver a intentar"}
      </Button>
      <Button href="/login">Volver al inicio de sesión</Button>
    </Stack>
  );
}

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../../../auth/useAuth";
import { loginPageStyles } from "./LoginPage.styles";
import type { LoginSubmitHandler } from "./LoginPage.types";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit: LoginSubmitHandler = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await login({ email, password });
      void navigate(response.organization ? "/orders" : "/organization");
    } catch (err) {
      setError((err as Error).message || "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={loginPageStyles.page}>
      <Card sx={loginPageStyles.card} elevation={3}>
        <CardContent>
          <Typography
            variant="h5"
            sx={loginPageStyles.brandTitle}
            color="primary"
          >
            VegyFresh
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={loginPageStyles.subtitle}
          >
            Inicia sesión para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={loginPageStyles.errorAlert}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <TextField
              label="Correo electrónico"
              type="email"
              fullWidth
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={loginPageStyles.submitButton}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </Box>

          <Typography variant="body2" sx={loginPageStyles.footerText}>
            ¿No tienes cuenta?{" "}
            <Link to="/signup" style={loginPageStyles.footerLink}>
              Registrarse
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

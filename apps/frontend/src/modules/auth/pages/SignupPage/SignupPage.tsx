import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../../../auth/useAuth";
import { signupPageStyles } from "./SignupPage.styles";
import type { SignupSubmitHandler } from "./SignupPage.types";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup: SignupSubmitHandler = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup({
        name,
        email,
        password,
      });
      void navigate("/organization");
    } catch (err) {
      setError((err as Error).message || "Error al crear la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={signupPageStyles.page}>
      <Card sx={signupPageStyles.card} elevation={3}>
        <CardContent>
          <Typography
            variant="h5"
            sx={signupPageStyles.brandTitle}
            color="primary"
          >
            VegyFresh
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={signupPageStyles.subtitle}
          >
            Crea tu usuario para comenzar.
          </Typography>

          {error && (
            <Alert severity="error" sx={signupPageStyles.errorAlert}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={(event) => {
              void handleSignup(event);
            }}
          >
            <Typography variant="subtitle2" sx={signupPageStyles.sectionTitle}>
              Datos del usuario
            </Typography>
            <TextField
              label="Nombre completo"
              fullWidth
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
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
              autoComplete="new-password"
              slotProps={{ htmlInput: { minLength: 12 } }}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={signupPageStyles.submitButton}
            >
              {loading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Registrarme"
              )}
            </Button>
          </Box>

          <Typography variant="body2" sx={signupPageStyles.footerText}>
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" style={signupPageStyles.footerLink}>
              Iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

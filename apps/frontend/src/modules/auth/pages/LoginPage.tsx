import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email, password });
      // If user has no organization, redirect to setup; otherwise to orders
      void navigate(response.organization ? '/orders' : '/organization-setup');
    } catch (err) {
      setError((err as Error).message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 400, p: 2 }} elevation={3}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }} color="primary">
            VegyFresh
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Inicia sesión para continuar
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(e) => { void handleSubmit(e); }}>
            <TextField
              label="Correo electrónico"
              type="email"
              fullWidth
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2, mb: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Iniciar sesión'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
            ¿No tienes cuenta?{' '}
            <Link to="/signup" style={{ color: 'inherit', fontWeight: 600 }}>
              Registrarse
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../../auth/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup({
        name,
        email,
        password,
      });
      void navigate('/organization-setup');
    } catch (err) {
      setError((err as Error).message || 'Error al crear la cuenta');
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
      <Card sx={{ width: '100%', maxWidth: 560, p: 2 }} elevation={3}>
        <CardContent>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }} color="primary">
            VegyFresh
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crea tu usuario para comenzar.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={(event) => { void handleSignup(event); }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
              sx={{ mt: 2, mb: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Registrarme'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 1 }}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" style={{ color: 'inherit', fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

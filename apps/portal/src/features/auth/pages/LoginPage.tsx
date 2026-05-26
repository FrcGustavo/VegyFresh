import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router';
import { useLoginMutation } from '../hooks/useLoginMutation';
import { usePortalSession } from '../hooks/usePortalSession';
import { loginSchema, type LoginSchemaInput } from '../schemas/loginSchema';

export function LoginPage() {
  const navigate = useNavigate();
  const session = usePortalSession();
  const loginMutation = useLoginMutation();
  const form = useForm<LoginSchemaInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (session.isAuthenticated) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={form.handleSubmit(async (values) => {
        await loginMutation.mutateAsync(values);
        navigate('/portal/dashboard', { replace: true });
      })}
    >
      <Typography variant="h5">Portal Login</Typography>
      {loginMutation.error instanceof Error ? (
        <Alert severity="error">{loginMutation.error.message}</Alert>
      ) : null}
      <TextField
        label="Email"
        type="email"
        {...form.register('email')}
        error={Boolean(form.formState.errors.email)}
        helperText={form.formState.errors.email?.message}
      />
      <TextField
        label="Password"
        type="password"
        {...form.register('password')}
        error={Boolean(form.formState.errors.password)}
        helperText={form.formState.errors.password?.message}
      />
      <Button type="submit" variant="contained" disabled={loginMutation.isPending}>
        Sign in
      </Button>
    </Stack>
  );
}

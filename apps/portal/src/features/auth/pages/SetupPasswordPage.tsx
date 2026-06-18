import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useSetupPasswordMutation } from "../hooks/useSetupPasswordMutation";
import { usePortalSession } from "../hooks/usePortalSession";
import {
  setupPasswordSchema,
  type SetupPasswordSchemaInput,
} from "../schemas/setupPasswordSchema";

export function SetupPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const session = usePortalSession();
  const mutation = useSetupPasswordMutation();
  const form = useForm<SetupPasswordSchemaInput>({
    resolver: zodResolver(setupPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  if (session.isAuthenticated) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  if (!token) {
    return (
      <Alert severity="error">
        Setup token is missing. Request a new setup link from your account
        manager.
      </Alert>
    );
  }

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={form.handleSubmit(async (values) => {
        await mutation.mutateAsync({ token, password: values.password });
        navigate("/portal/dashboard", { replace: true });
      })}
    >
      <Typography variant="h5">Set your password</Typography>
      {mutation.error instanceof Error ? (
        <Alert severity="error">{mutation.error.message}</Alert>
      ) : null}
      <TextField
        label="Password"
        type="password"
        {...form.register("password")}
        error={Boolean(form.formState.errors.password)}
        helperText={form.formState.errors.password?.message}
      />
      <TextField
        label="Confirm password"
        type="password"
        {...form.register("confirmPassword")}
        error={Boolean(form.formState.errors.confirmPassword)}
        helperText={form.formState.errors.confirmPassword?.message}
      />
      <Button type="submit" variant="contained" disabled={mutation.isPending}>
        Save password
      </Button>
    </Stack>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../auth/AuthContext";
import { authStorage } from "../../../auth/authStorage";
import { authApi } from "../../../auth/authApi";
import {
  organizationsMutationOptions,
  organizationsQueryOptions,
} from "../../../api";
import {
  EMPTY_ORGANIZATION_FORM,
  OrganizationForm,
  type OrganizationFormData,
  organizationToFormData,
} from "../../organizations/components/OrganizationForm";

export default function OrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization, refreshSession } = useAuth();
  const organizationId = organization?.id ?? "";

  const [formData, setFormData] = useState<OrganizationFormData>(
    EMPTY_ORGANIZATION_FORM,
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const organizationQuery = useQuery({
    ...organizationsQueryOptions.detail(organizationId),
    enabled: Boolean(organizationId),
  });
  const createMutation = useMutation(
    organizationsMutationOptions.create(queryClient),
  );
  const updateMutation = useMutation(
    organizationsMutationOptions.update(queryClient),
  );

  useEffect(() => {
    if (organizationQuery.data) {
      queueMicrotask(() => {
        setFormData(organizationToFormData(organizationQuery.data));
      });
    }
  }, [organizationQuery.data]);

  const displayedError = error || organizationQuery.error?.message || "";

  const handleChange = (name: keyof OrganizationFormData, value: string) => {
    setFormData((current) => ({
      ...current,
      [name]: name === "name" ? value : value.trim() ? value.trim() : null,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const payload = {
      name: formData.name.trim(),
      logo_url: formData.logo_url,
      legal_name: formData.legal_name,
      email: formData.email,
      phone_number: formData.phone_number,
      address: formData.address,
      product_folio_prefix: formData.product_folio_prefix,
      price_list_folio_prefix: formData.price_list_folio_prefix,
      order_folio_prefix: formData.order_folio_prefix,
      client_folio_prefix: formData.client_folio_prefix,
      supplier_folio_prefix: formData.supplier_folio_prefix,
      purchase_folio_prefix: formData.purchase_folio_prefix,
    };

    if (!organizationId) {
      createMutation.mutate(payload, {
        onSuccess: async () => {
          try {
            const refreshToken = authStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error("No hay refresh token para actualizar la sesión");
            }

            const tokens = await authApi.refresh(refreshToken);
            authStorage.setTokens(tokens.access_token, tokens.refresh_token);
            await refreshSession();
            void navigate("/orders");
          } catch (refreshError) {
            setError(
              refreshError instanceof Error
                ? refreshError.message
                : "No se pudo actualizar la sesión",
            );
          }
        },
        onError: (createError) => setError(createError.message),
      });
      return;
    }

    updateMutation.mutate(
      { id: organizationId, input: payload },
      {
        onSuccess: async (updated) => {
          setFormData(organizationToFormData(updated));
          await refreshSession();
          setSuccess("Organización actualizada");
          void navigate("/orders");
        },
        onError: (saveError) => setError(saveError.message),
      },
    );
  };

  if (organizationQuery.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        {organizationId ? "Organización" : "Configurar organización"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {organizationId
          ? "Edita los datos visibles de tu organización y los prefijos de folio."
          : "Completa los datos para activar tu cuenta."}
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 960 }}>
        {displayedError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {displayedError}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <OrganizationForm
          value={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          submitLabel={
            organizationId ? "Guardar cambios" : "Guardar organización"
          }
          secondaryActionLabel={organizationId ? "Volver" : undefined}
          onSecondaryAction={
            organizationId ? () => void navigate("/settings") : undefined
          }
        />
      </Paper>
    </Box>
  );
}

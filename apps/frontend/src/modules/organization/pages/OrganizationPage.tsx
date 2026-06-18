import { useEffect, useState, type FormEvent } from "react";
import { Alert, Box, CircularProgress, Paper, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthContext";
import { organizationApi } from "../../organizations/organizationApi";
import {
  EMPTY_ORGANIZATION_FORM,
  OrganizationForm,
  type OrganizationFormData,
  organizationToFormData,
} from "../../organizations/components/OrganizationForm";

export default function OrganizationPage() {
  const navigate = useNavigate();
  const { organization, refreshSession } = useAuth();
  const organizationId = organization?.id ?? "";

  const [formData, setFormData] = useState<OrganizationFormData>(
    EMPTY_ORGANIZATION_FORM,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadOrganization = async () => {
      if (!organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const currentOrganization =
          await organizationApi.getById(organizationId);
        if (!currentOrganization) {
          throw new Error("No se pudo cargar la organización");
        }
        setFormData(organizationToFormData(currentOrganization));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la organización",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrganization();
  }, [organizationId]);

  const handleChange = (name: keyof OrganizationFormData, value: string) => {
    setFormData((current) => ({
      ...current,
      [name]: name === "name" ? value : value.trim() ? value.trim() : null,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
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
        throw new Error("No se pudo resolver la organización actual");
      }
      const updated = await organizationApi.update(organizationId, payload);
      if (!updated) {
        throw new Error("No se pudo actualizar la organización");
      }
      setFormData(organizationToFormData(updated));
      await refreshSession();
      setSuccess("Organización actualizada");
      void navigate("/orders");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar la organización",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Organización
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Edita los datos visibles de tu organización y los prefijos de folio.
      </Typography>

      <Paper sx={{ p: 3, maxWidth: 960 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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
          isSubmitting={isSaving}
          submitLabel="Guardar cambios"
          secondaryActionLabel="Volver"
          onSecondaryAction={() => void navigate("/settings")}
        />
      </Paper>
    </Box>
  );
}

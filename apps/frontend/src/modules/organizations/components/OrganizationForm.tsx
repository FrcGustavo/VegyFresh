import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import { useState, type FormEventHandler } from "react";
import { validateImageFile } from "../../../utils/imageValidation";

export type OrganizationFormSection = "general" | "folios";

export interface OrganizationFormData {
  name: string;
  logo_url: string | null;
  legal_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  product_folio_prefix: string | null;
  price_list_folio_prefix: string | null;
  order_folio_prefix: string | null;
  client_folio_prefix: string | null;
  supplier_folio_prefix: string | null;
  user_folio_prefix: string | null;
  purchase_folio_prefix: string | null;
}

interface OrganizationFormProps {
  value: OrganizationFormData;
  onChange: (name: keyof OrganizationFormData, value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  section?: OrganizationFormSection;
  isSubmitting?: boolean;
  submitLabel: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

const PREFIX_FIELDS = [
  { name: "product_folio_prefix", label: "Prefijo folio productos" },
  { name: "price_list_folio_prefix", label: "Prefijo listas de precios" },
  { name: "order_folio_prefix", label: "Prefijo folio pedidos" },
  { name: "client_folio_prefix", label: "Prefijo folio clientes" },
  { name: "supplier_folio_prefix", label: "Prefijo folio proveedores" },
  { name: "user_folio_prefix", label: "Prefijo folio usuarios" },
  { name: "purchase_folio_prefix", label: "Prefijo folio compras" },
] as const;

const optionalValue = (value: string | null) => value ?? "";

export function OrganizationForm({
  value,
  onChange,
  onSubmit,
  section = "general",
  isSubmitting = false,
  submitLabel,
  secondaryActionLabel,
  onSecondaryAction,
}: OrganizationFormProps) {
  const avatarLabel = value.name.trim() || "Organización";
  const avatarInitial = avatarLabel.charAt(0).toUpperCase();
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarFileChange = (file: File) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setAvatarError(validationError);
      return;
    }

    setAvatarError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onChange("logo_url", result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box component="form" onSubmit={onSubmit}>
      {section === "general" && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Avatar
              src={optionalValue(value.logo_url) || undefined}
              alt={avatarLabel}
              sx={{
                width: 112,
                height: 112,
                fontSize: 40,
                bgcolor: "primary.main",
              }}
            >
              {avatarInitial}
            </Avatar>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Avatar de organización
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  component="label"
                  disabled={isSubmitting}
                >
                  Cambiar imagen
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        handleAvatarFileChange(file);
                      }
                      event.currentTarget.value = "";
                    }}
                  />
                </Button>
                <Button
                  type="button"
                  variant="text"
                  color="error"
                  disabled={isSubmitting || !value.logo_url}
                  onClick={() => {
                    setAvatarError("");
                    onChange("logo_url", "");
                  }}
                >
                  Eliminar
                </Button>
              </Box>
              {avatarError && (
                <Typography color="error" variant="body2">
                  {avatarError}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={value.name}
              onChange={(event) => onChange("name", event.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Razón social"
              value={optionalValue(value.legal_name)}
              onChange={(event) => onChange("legal_name", event.target.value)}
            />
            <TextField
              fullWidth
              label="Correo"
              value={optionalValue(value.email)}
              onChange={(event) => onChange("email", event.target.value)}
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={optionalValue(value.phone_number)}
              onChange={(event) => onChange("phone_number", event.target.value)}
            />
            <TextField
              fullWidth
              label="Dirección"
              value={optionalValue(value.address)}
              onChange={(event) => onChange("address", event.target.value)}
              multiline
              minRows={2}
            />
          </Box>
        </Box>
      )}

      {section === "folios" && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Prefijos de folio
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 2,
            }}
          >
            {PREFIX_FIELDS.map((field) => (
              <TextField
                key={field.name}
                label={field.label}
                value={optionalValue(value[field.name])}
                onChange={(event) => onChange(field.name, event.target.value)}
                helperText="Máximo 10 letras o números."
              />
            ))}
          </Box>
        </>
      )}

      <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
        <Button type="submit" variant="contained" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : submitLabel}
        </Button>
        {onSecondaryAction && secondaryActionLabel && (
          <Button variant="outlined" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}

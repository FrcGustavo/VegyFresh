import { Box, Button, TextField, Typography } from "@mui/material";
import type { FormEventHandler } from "react";
import type {
  OrganizationDto,
  UpdateOrganizationPayload,
} from "../organizationApi";

export type OrganizationFormData = UpdateOrganizationPayload;

export const EMPTY_ORGANIZATION_FORM: OrganizationFormData = {
  name: "",
  logo_url: null,
  legal_name: null,
  email: null,
  phone_number: null,
  address: null,
  product_folio_prefix: "P",
  price_list_folio_prefix: "L",
  order_folio_prefix: "O",
  client_folio_prefix: "C",
  supplier_folio_prefix: "S",
  purchase_folio_prefix: "C",
};

export const organizationToFormData = (
  organization: OrganizationDto,
): OrganizationFormData => ({
  name: organization.name ?? "",
  logo_url: organization.logo_url ?? null,
  legal_name: organization.legal_name ?? null,
  email: organization.email ?? null,
  phone_number: organization.phone_number ?? null,
  address: organization.address ?? null,
  product_folio_prefix: organization.product_folio_prefix ?? null,
  price_list_folio_prefix: organization.price_list_folio_prefix ?? null,
  order_folio_prefix: organization.order_folio_prefix ?? null,
  client_folio_prefix: organization.client_folio_prefix ?? null,
  supplier_folio_prefix: organization.supplier_folio_prefix ?? null,
  purchase_folio_prefix: organization.purchase_folio_prefix ?? null,
});

interface OrganizationFormProps {
  value: OrganizationFormData;
  onChange: (name: keyof OrganizationFormData, value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
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
  { name: "purchase_folio_prefix", label: "Prefijo folio compras" },
] as const;

const optionalValue = (value: string | null) => value ?? "";

export function OrganizationForm({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  secondaryActionLabel,
  onSecondaryAction,
}: OrganizationFormProps) {
  return (
    <Box component="form" onSubmit={onSubmit}>
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
        label="Logo URL"
        value={optionalValue(value.logo_url)}
        onChange={(event) => onChange("logo_url", event.target.value)}
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

      <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
        Prefijos de folio
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
          gap: 2,
        }}
      >
        {PREFIX_FIELDS.map((field) => (
          <TextField
            key={field.name}
            label={field.label}
            value={optionalValue(value[field.name])}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        ))}
      </Box>

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

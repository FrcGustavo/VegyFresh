import { Avatar, Box, Button, TextField, Typography } from "@mui/material";
import { supplierFormStyles } from "./SupplierForm.styles";
import type { SupplierFormProps } from "./SupplierForm.types";

export default function SupplierForm({
  formData,
  logoFileError,
  handleChange,
  handleLogoFileChange,
  handleSubmit,
  isDisabled = false,
}: SupplierFormProps) {
  return (
    <Box sx={supplierFormStyles.root}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
      >
        <Box sx={supplierFormStyles.layout}>
          <Box sx={supplierFormStyles.logoColumn}>
            <Avatar
              src={formData.logo_url || undefined}
              alt={formData.name || "Proveedor"}
              sx={supplierFormStyles.logoAvatar}
            >
              {(formData.name || "P").charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              disabled={isDisabled}
              sx={supplierFormStyles.logoButton}
            >
              Seleccionar logo
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleLogoFileChange(file);
                  }
                }}
              />
            </Button>
            {logoFileError && (
              <Typography color="error" variant="body2">
                {logoFileError}
              </Typography>
            )}
          </Box>

          <Box sx={supplierFormStyles.fieldsColumn}>
            <TextField
              fullWidth
              label="Nombre"
              name="name"
              margin="normal"
              value={formData.name || ""}
              onChange={handleChange}
              required
              disabled={isDisabled}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              margin="normal"
              value={formData.email || ""}
              onChange={handleChange}
              disabled={isDisabled}
            />
            <TextField
              fullWidth
              label="Teléfono"
              name="phone_number"
              margin="normal"
              value={formData.phone_number || ""}
              onChange={handleChange}
              disabled={isDisabled}
            />
          </Box>
        </Box>
      </form>
    </Box>
  );
}

import { Avatar, Box, Button, TextField, Typography } from "@mui/material";

type SupplierChangeEvent = { target: { name: string; value: string } };
interface SupplierFormData {
  name: string;
  email: string;
  phone_number: string;
  logo_url: string;
}

interface SupplierFormProps {
  formData: SupplierFormData;
  logoFileError?: string;
  handleChange: (e: SupplierChangeEvent) => void;
  handleLogoFileChange: (file: File) => void;
  handleSubmit: (action: "save" | "save-and-close" | "save-and-new") => void;
  isDisabled?: boolean;
}

export default function SupplierForm({
  formData,
  logoFileError,
  handleChange,
  handleLogoFileChange,
  handleSubmit,
  isDisabled = false,
}: SupplierFormProps) {
  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 3,
            alignItems: "flex-start",
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", md: 220 },
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Avatar
              src={formData.logo_url || undefined}
              alt={formData.name || "Proveedor"}
              sx={{ width: 150, height: 150 }}
            >
              {(formData.name || "P").charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              disabled={isDisabled}
              sx={{ width: "100%" }}
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

          <Box sx={{ flex: 1, minWidth: 320 }}>
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

import { Box, TextField, MenuItem, Alert, Button, Avatar } from "@mui/material";
import { userFormStyles } from "./UserForm.styles";
import type { UserFormProps } from "./UserForm.types";

export default function UserForm({
  formData,
  avatarFileError,
  roles,
  isEditing,
  isCreatingRole,
  handleChange,
  handleAvatarFileChange,
  handleSubmit,
  createAdminRole,
  isDisabled = false,
}: UserFormProps) {
  return (
    <Box sx={userFormStyles.root}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit("save");
        }}
      >
        <Box sx={userFormStyles.layout}>
          <Box sx={userFormStyles.avatarColumn}>
            <Avatar
              src={formData.avatar_url || undefined}
              alt={formData.name || "Usuario"}
              sx={userFormStyles.avatar}
            >
              {(formData.name || "U").charAt(0).toUpperCase()}
            </Avatar>
            <Button
              variant="outlined"
              component="label"
              disabled={isDisabled}
              sx={userFormStyles.avatarButton}
            >
              Seleccionar avatar
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleAvatarFileChange(file);
                  }
                }}
              />
            </Button>
            {avatarFileError && (
              <Alert severity="error" sx={userFormStyles.avatarError}>
                {avatarFileError}
              </Alert>
            )}
          </Box>

          <Box sx={userFormStyles.fieldsColumn}>
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
              required
              disabled={isDisabled}
            />
            {!isEditing && (
              <TextField
                fullWidth
                label="Contraseña"
                name="password"
                type="password"
                margin="normal"
                value={formData.password || ""}
                onChange={handleChange}
                required
                disabled={isDisabled}
                slotProps={{ htmlInput: { minLength: 12 } }}
                helperText="Debe tener al menos 12 caracteres"
              />
            )}

            <TextField
              select
              fullWidth
              label="Rol"
              name="role_id"
              margin="normal"
              value={formData.role_id || ""}
              onChange={handleChange}
              required
              disabled={isDisabled}
            >
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            {roles.length === 0 && (
              <Alert severity="warning" sx={userFormStyles.noRolesAlert}>
                No existen roles.
                <Button
                  size="small"
                  onClick={createAdminRole}
                  disabled={isCreatingRole || isDisabled}
                >
                  {isCreatingRole ? "Creando..." : "Crear rol Admin"}
                </Button>
              </Alert>
            )}
          </Box>
        </Box>
      </form>
    </Box>
  );
}

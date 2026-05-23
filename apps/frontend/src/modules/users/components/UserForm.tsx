import { Box, TextField, MenuItem, Alert, Button, Avatar } from '@mui/material';

type UserChangeEvent = { target: { name: string; value: string } };
interface UserFormData {
  name: string;
  email: string;
  role_id: string;
  avatar_url: string;
}
interface RoleOption {
  id: string;
  name: string;
}

interface UserFormProps {
  formData: UserFormData;
  roles: RoleOption[];
  isCreatingRole: boolean;
  handleChange: (e: UserChangeEvent) => void;
  handleAvatarFileChange: (file: File) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  createAdminRole: () => void;
  isDisabled?: boolean;
}

export default function UserForm({
  formData,
  roles,
  isCreatingRole,
  handleChange,
  handleAvatarFileChange,
  handleSubmit,
  createAdminRole,
  isDisabled = false
}: UserFormProps) {

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Box
              sx={{
                width: { xs: '100%', md: 220 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Avatar
                src={formData.avatar_url || undefined}
                alt={formData.name || 'Usuario'}
                sx={{ width: 150, height: 150 }}
              >
                {(formData.name || 'U').charAt(0).toUpperCase()}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                disabled={isDisabled}
                sx={{ width: '100%' }}
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
            </Box>

            <Box sx={{ flex: 1, minWidth: 320 }}>
              <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
              <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} required disabled={isDisabled} />

              <TextField select fullWidth label="Rol" name="role_id" margin="normal" value={formData.role_id || ''} onChange={handleChange} required disabled={isDisabled}>
                {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
              </TextField>

              {roles.length === 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No existen roles.
                  <Button size="small" onClick={createAdminRole} disabled={isCreatingRole || isDisabled}>
                    {isCreatingRole ? 'Creando...' : 'Crear rol Admin'}
                  </Button>
                </Alert>
              )}
            </Box>
          </Box>
        </form>
    </Box>
  );
}

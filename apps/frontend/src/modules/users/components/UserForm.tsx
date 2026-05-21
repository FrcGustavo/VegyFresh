import { Box, TextField, MenuItem, Typography, Paper, Alert, Button } from '@mui/material';

interface UserFormProps {
  formData: any;
  roles: any[];
  isCreatingRole: boolean;
  handleChange: (e: any) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  createAdminRole: () => void;
  title: string;
  isDisabled?: boolean;
}

export default function UserForm({
  formData,
  roles,
  isCreatingRole,
  handleChange,
  handleSubmit,
  createAdminRole,
  title,
  isDisabled = false
}: UserFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} required disabled={isDisabled} />
          
          <TextField select fullWidth label="Rol" name="role_id" margin="normal" value={formData.role_id || ''} onChange={handleChange} required disabled={isDisabled}>
            {roles.map((r: any) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>

          {roles.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No existen roles. 
              <Button size="small" onClick={createAdminRole} disabled={isCreatingRole || isDisabled}>
                {isCreatingRole ? 'Creando...' : 'Crear rol Admin'}
              </Button>
            </Alert>
          )}

        </form>
      </Paper>
    </Box>
  );
}

import { Box, TextField, MenuItem, Button, Typography, CircularProgress, Paper, Alert } from '@mui/material';
import { useNavigate } from 'react-router';

interface UserFormProps {
  formData: any;
  roles: any[];
  isSaving: boolean;
  isCreatingRole: boolean;
  handleChange: (e: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  createAdminRole: () => void;
  title: string;
}

export default function UserForm({
  formData,
  roles,
  isSaving,
  isCreatingRole,
  handleChange,
  handleSubmit,
  createAdminRole,
  title
}: UserFormProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required />
          <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} required />
          
          <TextField select fullWidth label="Rol" name="role_id" margin="normal" value={formData.role_id || ''} onChange={handleChange} required>
            {roles.map((r: any) => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
          </TextField>

          {roles.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              No existen roles. 
              <Button size="small" onClick={createAdminRole} disabled={isCreatingRole}>
                {isCreatingRole ? 'Creando...' : 'Crear rol Admin'}
              </Button>
            </Alert>
          )}

          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Usuario'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/users')} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

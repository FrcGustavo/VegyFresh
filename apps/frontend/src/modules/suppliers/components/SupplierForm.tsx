import { Box, TextField, Button, Typography, CircularProgress, Paper } from '@mui/material';
import { useNavigate } from 'react-router';

interface SupplierFormProps {
  formData: any;
  isSaving: boolean;
  handleChange: (e: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  title: string;
}

export default function SupplierForm({
  formData,
  isSaving,
  handleChange,
  handleSubmit,
  title
}: SupplierFormProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required />
          <TextField fullWidth label="Información de Contacto" name="contact_info" margin="normal" value={formData.contact_info || ''} onChange={handleChange} multiline rows={3} />
          <TextField fullWidth label="Logo URL" name="logo_url" margin="normal" value={formData.logo_url || ''} onChange={handleChange} />
          
          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Proveedor'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/suppliers')} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

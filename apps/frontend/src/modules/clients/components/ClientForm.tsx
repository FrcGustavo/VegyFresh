import { Box, TextField, MenuItem, Button, Typography, CircularProgress, Paper } from '@mui/material';
import { useNavigate } from 'react-router';

interface ClientFormProps {
  formData: any;
  priceLists: any[];
  isSaving: boolean;
  handleChange: (e: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  title: string;
}

export default function ClientForm({
  formData,
  priceLists,
  isSaving,
  handleChange,
  handleSubmit,
  title
}: ClientFormProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required />
          <TextField fullWidth label="Teléfono" name="phone_number" margin="normal" value={formData.phone_number || ''} onChange={handleChange} required />
          <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} />
          <TextField fullWidth label="Dirección" name="address" margin="normal" value={formData.address || ''} onChange={handleChange} />
          
          <TextField select fullWidth label="Lista de Precios" name="price_list_id" margin="normal" value={formData.price_list_id || ''} onChange={handleChange}>
            <MenuItem value=""><em>Ninguna</em></MenuItem>
            {priceLists.map((list: any) => (
              <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
            ))}
          </TextField>

          <Box sx={{ mt: 3 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Cliente'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/clients')} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

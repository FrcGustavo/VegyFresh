import { Box, TextField, MenuItem, Typography, Paper } from '@mui/material';

interface ClientFormProps {
  formData: any;
  priceLists: any[];
  handleChange: (e: any) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  title: string;
  isDisabled?: boolean;
}

export default function ClientForm({
  formData,
  priceLists,
  handleChange,
  handleSubmit,
  title,
  isDisabled = false
}: ClientFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Teléfono" name="phone_number" margin="normal" value={formData.phone_number || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Email" name="email" margin="normal" value={formData.email || ''} onChange={handleChange} disabled={isDisabled} />
          <TextField fullWidth label="Dirección" name="address" margin="normal" value={formData.address || ''} onChange={handleChange} disabled={isDisabled} />
          
          <TextField select fullWidth label="Lista de Precios" name="price_list_id" margin="normal" value={formData.price_list_id || ''} onChange={handleChange} disabled={isDisabled}>
            <MenuItem value=""><em>Ninguna</em></MenuItem>
            {priceLists.map((list: any) => (
              <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
            ))}
          </TextField>
        </form>
      </Paper>
    </Box>
  );
}

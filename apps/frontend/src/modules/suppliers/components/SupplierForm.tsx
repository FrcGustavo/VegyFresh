import { Box, TextField, Typography, Paper } from '@mui/material';

interface SupplierFormProps {
  formData: any;
  handleChange: (e: any) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  title: string;
  isDisabled?: boolean;
}

export default function SupplierForm({
  formData,
  handleChange,
  handleSubmit,
  title,
  isDisabled = false
}: SupplierFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Información de Contacto" name="contact_info" margin="normal" value={formData.contact_info || ''} onChange={handleChange} multiline rows={3} disabled={isDisabled} />
          <TextField fullWidth label="Logo URL" name="logo_url" margin="normal" value={formData.logo_url || ''} onChange={handleChange} disabled={isDisabled} />
        </form>
      </Paper>
    </Box>
  );
}

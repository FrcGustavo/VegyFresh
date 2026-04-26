import { Button, TextField, Typography, Box, Paper, CircularProgress, MenuItem, IconButton, Autocomplete } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';

interface PriceListFormProps {
  name: string;
  setName: (name: string) => void;
  productsList: any[];
  products: any[];
  isSaving: boolean;
  addProductField: () => void;
  updateProductField: (index: number, field: string, value: any) => void;
  removeProductField: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  title: string;
}

export default function PriceListForm({
  name,
  setName,
  productsList,
  products,
  isSaving,
  addProductField,
  updateProductField,
  removeProductField,
  handleSubmit,
  title
}: PriceListFormProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 800 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Nombre de la Lista" margin="normal" value={name} onChange={(e) => setName(e.target.value)} required />
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Productos en esta lista</Typography>
          {productsList.map((p, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name + ' (' + option.sku + ')'}
                value={products.find(prod => prod.id === p.product_id) || null}
                onChange={(e, newValue) => updateProductField(index, 'product_id', newValue ? newValue.id : '')}
                sx={{ flex: 1 }}
                renderInput={(params) => <TextField {...params} label="Seleccionar Producto" required />}
              />
              <TextField 
                type="number" 
                label="Precio Asignado ($)" 
                value={p.price} 
                onChange={(e) => updateProductField(index, 'price', e.target.value)}
                sx={{ width: 200 }}
                required
              />
              <IconButton color="error" onClick={() => removeProductField(index)}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addProductField} sx={{ mb: 2 }}>Agregar Producto a la Lista</Button>

          <Box sx={{ mt: 3, borderTop: 1, borderColor: 'divider', pt: 3 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving || !name}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Lista Completa'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/price-lists')} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

import { Box, TextField, MenuItem, Button, Typography, IconButton, CircularProgress, Paper } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';

interface ProductFormProps {
  formData: any;
  prices: any[];
  suppliers: any[];
  priceLists: any[];
  isSaving: boolean;
  handleChange: (e: any) => void;
  addPriceField: () => void;
  removePriceField: (index: number) => void;
  updatePriceField: (index: number, field: string, value: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  title: string;
  onCancel?: () => void;
}

export default function ProductForm({
  formData,
  prices,
  suppliers,
  priceLists,
  isSaving,
  handleChange,
  addPriceField,
  removePriceField,
  updatePriceField,
  handleSubmit,
  title,
  onCancel
}: ProductFormProps) {
  const navigate = useNavigate();

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/products');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="SKU" name="sku" margin="normal" value={formData.sku || ''} onChange={handleChange} required />
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required />
          <TextField fullWidth label="Descripción" name="description" margin="normal" value={formData.description || ''} onChange={handleChange} />
          <TextField fullWidth label="Stock" name="stock" type="number" margin="normal" value={formData.stock || ''} onChange={handleChange} />
          <TextField select fullWidth label="Proveedor" name="supplier_id" margin="normal" value={formData.supplier_id || ''} onChange={handleChange} required>
            {suppliers.map((s: any) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Precios</Typography>
          {prices.map((p, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField 
                select 
                label="Lista de Precio" 
                value={p.price_list_id} 
                onChange={(e) => updatePriceField(index, 'price_list_id', e.target.value)}
                sx={{ flex: 1 }}
                required
              >
                {priceLists.map((list: any) => (
                  <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
                ))}
              </TextField>
              <TextField 
                type="number" 
                label="Precio ($)" 
                value={p.price} 
                onChange={(e) => updatePriceField(index, 'price', e.target.value)}
                sx={{ width: 150 }}
                required
              />
              <IconButton color="error" onClick={() => removePriceField(index)}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addPriceField}>Agregar precio en otra lista</Button>
          
          <Box sx={{ mt: 4 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Producto'}
            </Button>
            <Button variant="outlined" onClick={handleCancel} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

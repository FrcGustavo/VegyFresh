import { Button, TextField, Typography, Box, Paper, IconButton, Autocomplete } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

interface PriceListFormProps {
  name: string;
  setName: (name: string) => void;
  productsList: any[];
  products: any[];
  isSaving: boolean;
  addProductField: () => void;
  updateProductField: (index: number, field: string, value: any) => void;
  removeProductField: (index: number) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  title: string;
  isDisabled?: boolean;
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
  title,
  isDisabled = false
}: PriceListFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 800 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <TextField fullWidth label="Nombre de la Lista" margin="normal" value={name} onChange={(e) => setName(e.target.value)} required disabled={isDisabled} />
          
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Productos en esta lista</Typography>
          {productsList.map((p, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <Autocomplete
                options={products}
                getOptionLabel={(option) => option.name + ' (' + option.sku + ')'}
                value={products.find(prod => prod.id === p.product_id) || null}
                onChange={(_, newValue) => updateProductField(index, 'product_id', newValue ? newValue.id : '')}
                disabled={isDisabled}
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
                disabled={isDisabled}
              />
              {!isDisabled && <IconButton color="error" onClick={() => removeProductField(index)}><DeleteIcon /></IconButton>}
            </Box>
          ))}
          {!isDisabled && <Button startIcon={<AddIcon />} onClick={addProductField} sx={{ mb: 2 }}>Agregar Producto a la Lista</Button>}

        </form>
      </Paper>
    </Box>
  );
}

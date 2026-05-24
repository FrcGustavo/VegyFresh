import { Box, TextField, MenuItem, Typography, IconButton, Paper, Button } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';

type ProductChangeEvent = { target: { name: string; value: string } };
interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  stock: number | string;
  supplier_id: string;
}
interface ProductPrice {
  id?: string | number;
  clientRowId: string;
  price_list_id: string;
  price: number | string;
}
interface SupplierOption {
  id: string;
  name: string;
}
interface PriceListOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  formData: ProductFormData;
  prices: ProductPrice[];
  suppliers: SupplierOption[];
  priceLists: PriceListOption[];
  handleChange: (e: ProductChangeEvent) => void;
  addPriceField: () => void;
  removePriceField: (index: number) => void;
  updatePriceField: (index: number, field: string, value: string | number) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  title: string;
  isDisabled?: boolean;
}

export default function ProductForm({
  formData,
  prices,
  suppliers,
  priceLists,
  handleChange,
  addPriceField,
  removePriceField,
  updatePriceField,
  handleSubmit,
  title,
  isDisabled = false
}: ProductFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <TextField fullWidth label="SKU" name="sku" margin="normal" value={formData.sku || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Nombre" name="name" margin="normal" value={formData.name || ''} onChange={handleChange} required disabled={isDisabled} />
          <TextField fullWidth label="Descripción" name="description" margin="normal" value={formData.description || ''} onChange={handleChange} disabled={isDisabled} />
          <TextField fullWidth label="Stock" name="stock" type="number" margin="normal" value={formData.stock || ''} onChange={handleChange} disabled={isDisabled} />
          <TextField select fullWidth label="Proveedor" name="supplier_id" margin="normal" value={formData.supplier_id || ''} onChange={handleChange} required disabled={isDisabled}>
            {suppliers.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>

          <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Precios</Typography>
          {prices.map((p, index) => (
            <Box key={p.id ?? p.clientRowId} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
              <TextField 
                select 
                label="Lista de Precio" 
                value={p.price_list_id} 
                onChange={(e) => updatePriceField(index, 'price_list_id', e.target.value)}
                sx={{ flex: 1 }}
                required
                disabled={isDisabled}
              >
                {priceLists.map((list) => (
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
                disabled={isDisabled}
              />
              {!isDisabled && <IconButton color="error" onClick={() => removePriceField(index)}><DeleteIcon /></IconButton>}
            </Box>
          ))}
          {!isDisabled && <Button startIcon={<AddIcon />} onClick={addPriceField}>Agregar precio en otra lista</Button>}
        </form>
      </Paper>
    </Box>
  );
}

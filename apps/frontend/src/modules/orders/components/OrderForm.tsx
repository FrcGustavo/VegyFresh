import { Box, TextField, MenuItem, Button, Typography, IconButton, CircularProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Autocomplete } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';

interface OrderFormProps {
  formData: any;
  items: any[];
  clients: any[];
  users: any[];
  products: any[];
  totalGeneral: number;
  isSaving: boolean;
  handleChange: (e: any) => void;
  addItemField: () => void;
  removeItemField: (index: number) => void;
  updateItemField: (index: number, field: string, value: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  title: string;
}

export default function OrderForm({
  formData,
  items,
  clients,
  users,
  products,
  totalGeneral,
  isSaving,
  handleChange,
  addItemField,
  removeItemField,
  updateItemField,
  handleSubmit,
  title
}: OrderFormProps) {
  const navigate = useNavigate();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <TextField select sx={{ flex: 1, minWidth: 300 }} label="Cliente" name="client_id" value={formData.client_id || ''} onChange={handleChange} required>
              {clients.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Vendedor" name="user_id" value={formData.user_id || ''} onChange={handleChange} required>
              {users.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Origen" name="origin" margin="normal" value={formData.origin || ''} onChange={handleChange} required>
              <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
            </TextField>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Estado" name="status" margin="normal" value={formData.status || ''} onChange={handleChange} required>
              <MenuItem value="PENDING_REVIEW">Pendiente de revisión</MenuItem>
              <MenuItem value="APPROVED">Aprobado</MenuItem>
              <MenuItem value="REJECTED">Rechazado</MenuItem>
              <MenuItem value="DELIVERED">Entregado</MenuItem>
            </TextField>
          </Box>

          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Productos del Pedido</Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>Producto</TableCell>
                  <TableCell sx={{ width: '15%' }}>Cantidad</TableCell>
                  <TableCell sx={{ width: '20%' }}>Precio Unit.</TableCell>
                  <TableCell sx={{ width: '15%' }}>Subtotal</TableCell>
                  <TableCell sx={{ width: '10%' }} align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Autocomplete
                        options={products}
                        getOptionLabel={(option: any) => option.name || ''}
                        value={item.product || null}
                        onChange={(_, newValue) => updateItemField(index, 'product', newValue)}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Buscar producto..." required />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" variant="standard" value={item.quantity} onChange={(e) => updateItemField(index, 'quantity', e.target.value)} inputProps={{ min: 1 }} required />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" variant="standard" value={item.unit_price} onChange={(e) => updateItemField(index, 'unit_price', e.target.value)} required />
                    </TableCell>
                    <TableCell>
                      ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={() => removeItemField(index)} size="small"><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right"><Typography variant="subtitle1"><b>Total General:</b></Typography></TableCell>
                  <TableCell colSpan={2}><Typography variant="subtitle1" color="primary"><b>${totalGeneral.toFixed(2)}</b></Typography></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Button startIcon={<AddIcon />} onClick={addItemField} variant="outlined" sx={{ mb: 4 }}>Agregar Producto</Button>
          
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3 }}>
            <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
              {isSaving ? <CircularProgress size={24} /> : 'Guardar Pedido'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/orders')} sx={{ ml: 2 }}>Cancelar</Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}

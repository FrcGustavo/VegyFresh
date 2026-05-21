import { Box, TextField, MenuItem, Typography, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Autocomplete, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface OrderFormProps {
  formData: any;
  items: any[];
  clients: any[];
  users: any[];
  products: any[];
  totalGeneral: number;
  handleChange: (e: any) => void;
  addItemField: () => void;
  updateItemField: (index: number, field: string, value: any) => void;
  handleSubmit: (action: 'save' | 'save-and-close' | 'save-and-new') => void;
  title: string;
  isDisabled?: boolean;
}

export default function OrderForm({
  formData,
  items,
  clients,
  users,
  products,
  totalGeneral,
  handleChange,
  addItemField,
  updateItemField,
  handleSubmit,
  title,
  isDisabled = false
}: OrderFormProps) {

  return (
    <Box>
      <Typography variant="h4" gutterBottom>{title}</Typography>
      <Paper sx={{ p: 3, mb: 4 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit('save'); }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <TextField select sx={{ flex: 1, minWidth: 300 }} label="Cliente" name="client_id" value={formData.client_id || ''} onChange={handleChange} required disabled={isDisabled}>
              {clients.map((c: any) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Vendedor" name="user_id" value={formData.user_id || ''} onChange={handleChange} required disabled={isDisabled}>
              {users.map((u: any) => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
            </TextField>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Origen" name="origin" margin="normal" value={formData.origin || ''} onChange={handleChange} required disabled={isDisabled}>
              <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
            </TextField>
            <TextField select sx={{ flex: 1, minWidth: 200 }} label="Estado" name="status" margin="normal" value={formData.status || ''} onChange={handleChange} required disabled={isDisabled}>
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
                  <TableCell sx={{ width: '25%' }}>Subtotal</TableCell>
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
                        disabled={isDisabled}
                        renderInput={(params) => <TextField {...params} variant="standard" placeholder="Buscar producto..." required />}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" variant="standard" value={item.quantity} onChange={(e) => updateItemField(index, 'quantity', e.target.value)} slotProps={{ htmlInput: { min: 1 } }} required disabled={isDisabled} />
                    </TableCell>
                    <TableCell>
                      <TextField type="number" variant="standard" value={item.unit_price} onChange={(e) => updateItemField(index, 'unit_price', e.target.value)} required disabled={isDisabled} />
                    </TableCell>
                    <TableCell>
                      ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} align="right"><Typography variant="subtitle1"><b>Total General:</b></Typography></TableCell>
                  <TableCell><Typography variant="subtitle1" color="primary"><b>${totalGeneral.toFixed(2)}</b></Typography></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {!isDisabled && <Button startIcon={<AddIcon />} onClick={addItemField} variant="outlined" sx={{ mb: 4 }}>Agregar Producto</Button>}
        </form>
      </Paper>
    </Box>
  );
}

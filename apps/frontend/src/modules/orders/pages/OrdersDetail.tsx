import { Button, Typography, Box, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';

export default function OrdersDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', id],
    queryFn: () => fetchApi(`/orders/${id}`)
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;
  if (!data) return <Typography>No encontrado</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detalle de Order</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>

        <Typography variant="body1" sx={{ mb: 2 }}>Pedido ID: {data.id.substring(0, 8)}</Typography>
        <Typography variant="body1"><b>Cliente:</b> {data.client?.name || data.client_id}</Typography>
        <Typography variant="body1"><b>Vendedor:</b> {data.user?.name || data.user_id}</Typography>
        <Typography variant="body1"><b>Estado:</b> {data.status}</Typography>
        <Typography variant="body1"><b>Origen:</b> {data.origin}</Typography>
        <Typography variant="body1"><b>Total:</b> ${data.total_amount}</Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Productos del Pedido</Typography>
        <TableContainer>
          <Table sx={{ mb: 3 }}>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio Unitario</TableCell>
                <TableCell>Subtotal</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items?.length > 0 ? data.items.map((item: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{item.product?.name || item.product_id}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${item.unit_price}</TableCell>
                  <TableCell>${(item.quantity * item.unit_price).toFixed(2)}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={3} align="center">No hay productos en este pedido</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
    
      </Paper>
      <Button variant="outlined" onClick={() => navigate('/orders')}>Volver</Button>
    </Box>
  );
}

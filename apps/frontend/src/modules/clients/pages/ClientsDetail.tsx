import { Button, Typography, Box, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';

export default function ClientsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', id],
    queryFn: () => fetchApi(`/clients/${id}`)
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;
  if (!data) return <Typography>No encontrado</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detalle de Client</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>

        <Typography variant="body1" sx={{ mb: 2 }}>Información detallada sobre este elemento.</Typography>
        <Typography variant="body2" color="text.secondary">Nombre: {data.name}</Typography>
        <Typography variant="body2" color="text.secondary">Teléfono: {data.phone_number}</Typography>
        <Typography variant="body2" color="text.secondary">Email: {data.email}</Typography>
        <Typography variant="body2" color="text.secondary">Dirección: {data.address}</Typography>
        <Typography variant="body2" color="text.secondary">Lista de Precios: {data.priceList?.name || 'Ninguna'}</Typography>
    
      </Paper>
      <Button variant="outlined" onClick={() => navigate('/clients')}>Volver</Button>
    </Box>
  );
}

import { Button, Typography, Box, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';

export default function SuppliersDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers', id],
    queryFn: () => fetchApi(`/suppliers/${id}`)
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;
  if (!data) return <Typography>No encontrado</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detalle de Supplier</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>

        <Typography variant="body1" sx={{ mb: 2 }}>Información detallada sobre este elemento.</Typography>
        <Typography variant="body2" color="text.secondary">Nombre: {data.name}</Typography>
        <Typography variant="body2" color="text.secondary">Contacto: {data.contact_info}</Typography>
    
      </Paper>
      <Button variant="outlined" onClick={() => navigate('/suppliers')}>Volver</Button>
    </Box>
  );
}

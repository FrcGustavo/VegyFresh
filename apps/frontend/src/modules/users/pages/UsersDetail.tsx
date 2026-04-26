import { Button, Typography, Box, Paper, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, TableContainer } from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';

export default function UsersDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchApi(`/users/${id}`)
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;
  if (!data) return <Typography>No encontrado</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Detalle de User</Typography>
      <Paper sx={{ p: 3, mb: 3 }}>

        <Typography variant="body1" sx={{ mb: 2 }}>Información detallada sobre este usuario.</Typography>
        <Typography variant="body2" color="text.secondary">Nombre: {data.name}</Typography>
        <Typography variant="body2" color="text.secondary">Email: {data.email}</Typography>
        
        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Administración de Roles</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Rol Asignado: {data.role?.name || data.role_id || 'Sin rol'}</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small">Cambiar a Administrador</Button>
          <Button variant="outlined" size="small" color="secondary">Cambiar a Ventas</Button>
        </Box>
    
      </Paper>
      <Button variant="outlined" onClick={() => navigate('/users')}>Volver</Button>
    </Box>
  );
}

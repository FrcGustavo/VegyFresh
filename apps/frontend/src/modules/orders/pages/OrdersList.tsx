import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, IconButton, Tooltip } from '@mui/material';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../api';

export default function OrdersList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchApi('/orders')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/orders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = Array.isArray(data) ? data : (data?.data || []);

  return (
    <div>
      <Typography variant="h4" gutterBottom>Lista de Orders</Typography>
      <Button component={Link} to="/orders/create" variant="contained" color="primary" sx={{ mb: 3 }}>
        Crear Nuevo
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
               <TableRow><TableCell colSpan={4} align="center">No hay registros</TableCell></TableRow>
            ) : list.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                <TableCell>{item.client?.name || "N/A"}</TableCell>
                <TableCell>{item.user?.name || "N/A"}</TableCell>
                <TableCell>
                  <Tooltip title="Ver"><IconButton component={Link} to={`/orders/${item.id}`} color="primary"><ViewIcon /></IconButton></Tooltip>
                  <Tooltip title="Editar"><IconButton component={Link} to={`/orders/${item.id}/edit`} color="secondary"><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton color="error" onClick={() => deleteMutation.mutate(item.id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

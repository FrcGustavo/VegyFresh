import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, IconButton, Tooltip } from '@mui/material';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../api';

export default function PriceListsList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });

  const list = Array.isArray(data) ? data : (data?.data || []);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (list.length <= 1) {
        alert("No puedes eliminar la última lista de precios existente.");
        return Promise.reject(new Error("No puedes eliminar la última lista de precios existente."));
      }
      return fetchApi(`/price-lists/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    }
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  return (
    <div>
      <Typography variant="h4" gutterBottom>Listas de Precios</Typography>
      <Button component={Link} to="/price-lists/create" variant="contained" color="primary" sx={{ mb: 3 }}>
        Crear Nueva
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
               <TableRow><TableCell colSpan={3} align="center">No hay registros</TableCell></TableRow>
            ) : list.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <Tooltip title="Editar"><IconButton component={Link} to={`/price-lists/${item.id}/edit`} color="secondary"><EditIcon /></IconButton></Tooltip>
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

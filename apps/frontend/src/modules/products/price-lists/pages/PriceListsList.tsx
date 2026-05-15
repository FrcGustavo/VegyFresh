import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../../api';
import { usePagination } from '../../../../hooks/usePagination';
import { useSearch } from '../../../../hooks/useSearch';
import TablePaginationFooter from '../../../../components/TablePaginationFooter';

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

  return <PriceListsTable list={list} onDelete={(id) => deleteMutation.mutate(id)} />;
}

function PriceListsTable({ list, onDelete }: { list: any[]; onDelete: (id: string) => void }) {
  const { query, setQuery, filtered } = useSearch(list, ['name']);
  const { page, rowsPerPage, paginated, handleChangePage, handleChangeRowsPerPage } = usePagination(filtered);

  return (
    <div>
      <Typography variant="h4" gutterBottom>Listas de Precios</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <Button component={Link} to="/price-lists/create" variant="contained" color="primary">
          Crear Nueva
        </Button>
        <TextField
          size="small"
          placeholder="Buscar por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 280 }}
        />
      </Box>
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
            {paginated.length === 0 ? (
               <TableRow><TableCell colSpan={3} align="center">No hay registros</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>
                  <Tooltip title="Editar"><IconButton component={Link} to={`/price-lists/${item.id}/edit`} color="secondary"><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton color="error" onClick={() => onDelete(item.id)}><DeleteIcon /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePaginationFooter
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </div>
  );
}

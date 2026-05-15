import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchApi } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { useSearch } from '../../../hooks/useSearch';
import TablePaginationFooter from '../../../components/TablePaginationFooter';
import ProductFormModal from '../components/ProductFormModal';

export default function ProductsList() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchApi('/products')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = Array.isArray(data) ? data : (data?.data || []);

  return <ProductsTable list={list} onDelete={(id) => deleteMutation.mutate(id)} />;
}

function ProductsTable({ list, onDelete }: { list: any[]; onDelete: (id: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { query, setQuery, filtered } = useSearch(list, ['sku', 'name', 'supplier.name']);
  const { page, rowsPerPage, paginated, handleChangePage, handleChangeRowsPerPage } = usePagination(filtered);

  return (
    <div>
      <ProductFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <Typography variant="h4" gutterBottom>Lista de Products</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <Button onClick={() => setIsModalOpen(true)} variant="contained" color="primary">
          Crear Nuevo
        </Button>
        <TextField
          size="small"
          placeholder="Buscar por SKU, nombre o proveedor..."
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
              <TableCell>SKU</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
               <TableRow><TableCell colSpan={4} align="center">No hay registros</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                <TableCell>{item.sku}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.supplier?.name || "N/A"}</TableCell>
                <TableCell>
                  <Tooltip title="Ver"><IconButton component={Link} to={`/products/${item.id}`} color="primary"><ViewIcon /></IconButton></Tooltip>
                  <Tooltip title="Editar"><IconButton component={Link} to={`/products/${item.id}/edit`} color="secondary"><EditIcon /></IconButton></Tooltip>
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

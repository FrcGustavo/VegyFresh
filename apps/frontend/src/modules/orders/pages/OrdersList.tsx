import { Visibility as ViewIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, IconButton, Tooltip, Autocomplete, TextField, InputAdornment } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { usePagination } from '../../../hooks/usePagination';
import { useSearch } from '../../../hooks/useSearch';
import TablePaginationFooter from '../../../components/TablePaginationFooter';

export default function OrdersList() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchApi('/orders')
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchApi('/clients')
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
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.data || []);

  const filteredList = selectedClient
    ? list.filter((item: any) => item.client?.id === selectedClient.id)
    : list;

  return (
    <OrdersTable
      list={filteredList}
      clients={clients}
      selectedClient={selectedClient}
      onClientChange={setSelectedClient}
      onDelete={(id) => deleteMutation.mutate(id)}
    />
  );
}

function OrdersTable({
  list,
  clients,
  selectedClient,
  onClientChange,
  onDelete,
}: {
  list: any[];
  clients: any[];
  selectedClient: { id: string; name: string } | null;
  onClientChange: (value: { id: string; name: string } | null) => void;
  onDelete: (id: string) => void;
}) {
  const { query, setQuery, filtered } = useSearch(list, ['client.name', 'user.name']);
  const { page, rowsPerPage, paginated, handleChangePage, handleChangeRowsPerPage } = usePagination(filtered);

  return (
    <div>
      <Typography variant="h4" gutterBottom>Lista de Orders</Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
        <Button component={Link} to="/orders/create" variant="contained" color="primary">
          Crear Nuevo
        </Button>
        <TextField
          size="small"
          placeholder="Buscar por cliente o usuario..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 280 }}
        />
        <Autocomplete
          options={clients}
          getOptionLabel={(option: any) => option.name ?? ''}
          value={selectedClient}
          onChange={(_e, value) => onClientChange(value)}
          isOptionEqualToValue={(option: any, value: any) => option.id === value.id}
          renderInput={(params) => (
            <TextField {...params} label="Filtrar por cliente" size="small" />
          )}
          sx={{ minWidth: 280 }}
        />
        {selectedClient && (
          <Button variant="text" size="small" onClick={() => onClientChange(null)}>
            Limpiar filtro
          </Button>
        )}
      </Box>
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
            {paginated.length === 0 ? (
               <TableRow><TableCell colSpan={4} align="center">No hay registros</TableCell></TableRow>
            ) : paginated.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                <TableCell>{item.client?.name || "N/A"}</TableCell>
                <TableCell>{item.user?.name || "N/A"}</TableCell>
                <TableCell>
                  <Tooltip title="Ver"><IconButton component={Link} to={`/orders/${item.id}`} color="primary"><ViewIcon /></IconButton></Tooltip>
                  <Tooltip title="Editar"><IconButton component={Link} to={`/orders/${item.id}/edit`} color="secondary"><EditIcon /></IconButton></Tooltip>
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

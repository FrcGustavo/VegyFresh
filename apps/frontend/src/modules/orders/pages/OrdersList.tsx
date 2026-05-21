import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, Autocomplete, TextField, Container } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { useSearch } from '../../../hooks/useSearch';
import OrderFormModal from '../components/OrderFormModal';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ListSearchField from '../../../components/ListSearchField';

export default function OrdersList() {
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchApi('/orders')
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchApi('/clients')
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
    />
  );
}

function OrdersTable({
  list,
  clients,
  selectedClient,
  onClientChange,
}: {
  list: any[];
  clients: any[];
  selectedClient: { id: string; name: string } | null;
  onClientChange: (value: { id: string; name: string } | null) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOrderId, setModalOrderId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { query, setQuery, filtered } = useSearch(list, ['client.name', 'user.name']);

  const currentIndex = filtered.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalOrderId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filtered.length) {
      const newItem = filtered[newIndex];
      setModalOrderId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  return (
    <div>
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderId={modalOrderId}
        title={modalOrderId ? 'Editar Pedido' : 'Crear Pedido'}
        list={filtered}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
      <ListPageToolbar>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              setModalOrderId(undefined);
              setIsModalOpen(true);
            }}
            variant="contained"
            color="primary"
          >
            Crear Nuevo
          </Button>
          <ListSearchField
            placeholder="Buscar por cliente o usuario..."
            value={query}
            onChange={setQuery}
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
      </ListPageToolbar>
      <Container>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center">No hay registros</TableCell></TableRow>
              ) : filtered.map((item: any) => {
                const rowId = String(item.id ?? '');
                return (
                  <TableRow
                    key={item.id}
                    hover
                    selected={selectedRowId === rowId}
                    onClick={() => setSelectedRowId(rowId)}
                    onDoubleClick={() => {
                      setModalOrderId(item.id);
                      setIsModalOpen(true);
                      setSelectedRowId(rowId);
                    }}
                    sx={{
                      cursor: 'pointer',
                      '&.Mui-selected': { backgroundColor: 'action.selected' },
                      '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{item.id?.substring(0, 8) || item.id}</TableCell>
                    <TableCell>{item.client?.name || "N/A"}</TableCell>
                    <TableCell>{item.user?.name || "N/A"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </div>
  );
}

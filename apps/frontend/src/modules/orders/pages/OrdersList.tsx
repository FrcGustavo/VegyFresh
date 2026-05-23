import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, TableContainer, CircularProgress, Box, Autocomplete, TextField } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { useSearch } from '../../../hooks/useSearch';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import OrderFormModal from '../components/OrderFormModal';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ListSearchField from '../../../components/ListSearchField';
import ResizableHeaderCell from '../../../components/ResizableHeaderCell';

const orderColumns = [
  { key: 'id', label: 'ID', minWidth: 120, defaultWidth: 140 },
  { key: 'client', label: 'Cliente', minWidth: 180, defaultWidth: 260 },
  { key: 'user', label: 'Usuario', minWidth: 180, defaultWidth: 220 },
  { key: 'created_at', label: 'Fecha creación', minWidth: 180, defaultWidth: 220 },
  { key: 'total_amount', label: 'Total', minWidth: 140, defaultWidth: 160 },
] as const;

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
  const { getColumnCellSx, startResizing, resetColumnWidth } = useResizableColumns(
    'orders-list',
    orderColumns,
  );

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

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('es-MX');
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'N/A';
    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
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
            disableElevation
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
      <TableContainer>
        <Table
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderLeft: 0,
            borderTop: 0,
            width: 'max-content',
            tableLayout: 'fixed',
          }}
        >
          <TableHead>
            <TableRow>
              {orderColumns.map((column) => (
                <ResizableHeaderCell
                  key={column.key}
                  label={column.label}
                  columnKey={column.key}
                  cellSx={getColumnCellSx(column.key)}
                  onResizeStart={startResizing}
                  onResetWidth={resetColumnWidth}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">No hay registros</TableCell></TableRow>
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
                  <TableCell sx={getColumnCellSx('id')}>{item.id?.substring(0, 8) || item.id}</TableCell>
                  <TableCell sx={getColumnCellSx('client')}>{item.client?.name || "N/A"}</TableCell>
                  <TableCell sx={getColumnCellSx('user')}>{item.user?.name || "N/A"}</TableCell>
                  <TableCell sx={getColumnCellSx('created_at')}>{formatDateTime(item.created_at)}</TableCell>
                  <TableCell sx={getColumnCellSx('total_amount')}>{formatCurrency(item.total_amount)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

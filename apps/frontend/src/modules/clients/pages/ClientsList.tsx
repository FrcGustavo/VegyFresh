import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, Container } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { useSearch } from '../../../hooks/useSearch';
import ClientFormModal from '../components/ClientFormModal';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ListSearchField from '../../../components/ListSearchField';

export default function ClientsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchApi('/clients')
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = Array.isArray(data) ? data : (data?.data || []);

  return <ClientsTable list={list} />;
}

function ClientsTable({ list }: { list: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { query, setQuery, filtered } = useSearch(list, ['name', 'phone_number']);

  const currentIndex = filtered.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalClientId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filtered.length) {
      const newItem = filtered[newIndex];
      setModalClientId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  return (
    <div>
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientId={modalClientId}
        title={modalClientId ? 'Editar Cliente' : 'Crear Cliente'}
        list={filtered}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
      <ListPageToolbar>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              setModalClientId(undefined);
              setIsModalOpen(true);
            }}
            variant="contained"
            color="primary"
          >
            Crear Nuevo
          </Button>
          <ListSearchField
            placeholder="Buscar por nombre o teléfono..."
            value={query}
            onChange={setQuery}
          />
        </Box>
      </ListPageToolbar>
      <Container>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Teléfono</TableCell>
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
                      setModalClientId(item.id);
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
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.phone_number}</TableCell>
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

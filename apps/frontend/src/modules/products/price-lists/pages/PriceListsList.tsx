import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, Container } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchApi } from '../../../../api';
import { useSearch } from '../../../../hooks/useSearch';
import PriceListFormModal from '../components/PriceListFormModal';
import ListPageToolbar from '../../../../components/ListPageToolbar';
import ListSearchField from '../../../../components/ListSearchField';

export default function PriceListsList() {
  const { data, isLoading, error } = useQuery({ queryKey: ['price-lists'], queryFn: () => fetchApi('/price-lists') });

  const list = Array.isArray(data) ? data : (data?.data || []);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  return <PriceListsTable list={list} />;
}

function PriceListsTable({ list }: { list: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPriceListId, setModalPriceListId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { query, setQuery, filtered } = useSearch(list, ['name']);

  const currentIndex = filtered.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalPriceListId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filtered.length) {
      const newItem = filtered[newIndex];
      setModalPriceListId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  return (
    <div>
      <PriceListFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        priceListId={modalPriceListId}
        title={modalPriceListId ? 'Editar Lista de Precios' : 'Crear Lista de Precios'}
        list={filtered}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
      <ListPageToolbar>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              setModalPriceListId(undefined);
              setIsModalOpen(true);
            }}
            variant="contained"
            color="primary"
          >
            Crear Nueva
          </Button>
          <ListSearchField
            placeholder="Buscar por nombre..."
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
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={2} align="center">No hay registros</TableCell></TableRow>
              ) : filtered.map((item: any) => {
                const rowId = String(item.id ?? '');
                return (
                  <TableRow
                    key={item.id}
                    hover
                    selected={selectedRowId === rowId}
                    onClick={() => setSelectedRowId(rowId)}
                    onDoubleClick={() => {
                      setModalPriceListId(item.id);
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

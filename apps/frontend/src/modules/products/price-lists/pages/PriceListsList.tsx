import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, TableContainer, CircularProgress, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchApi } from '../../../../api';
import { useSearch } from '../../../../hooks/useSearch';
import { useResizableColumns } from '../../../../hooks/useResizableColumns';
import PriceListFormModal from '../components/PriceListFormModal';
import ListPageToolbar from '../../../../components/ListPageToolbar';
import ListSearchField from '../../../../components/ListSearchField';
import ResizableHeaderCell from '../../../../components/ResizableHeaderCell';

const priceListColumns = [
  { key: 'id', label: 'ID', minWidth: 120, defaultWidth: 140 },
  { key: 'name', label: 'Nombre', minWidth: 180, defaultWidth: 280 },
] as const;

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
  const { getColumnCellSx, startResizing, resetColumnWidth } = useResizableColumns(
    'price-lists-list',
    priceListColumns,
  );

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
    <Box sx={{ backgroundColor: 'background.paper' }}>
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
            disableElevation
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
              {priceListColumns.map((column) => (
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
                  <TableCell sx={getColumnCellSx('id')}>{item.id?.substring(0, 8) || item.id}</TableCell>
                  <TableCell sx={getColumnCellSx('name')}>{item.name}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

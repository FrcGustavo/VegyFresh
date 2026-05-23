import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, TableContainer, CircularProgress, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchApi } from '../../../api';
import { useSearch } from '../../../hooks/useSearch';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import ProductFormModal from '../components/ProductFormModal';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ListSearchField from '../../../components/ListSearchField';
import ResizableHeaderCell from '../../../components/ResizableHeaderCell';

const productColumns = [
  { key: 'id', label: 'ID', minWidth: 120, defaultWidth: 140 },
  { key: 'sku', label: 'SKU', minWidth: 120, defaultWidth: 160 },
  { key: 'name', label: 'Nombre', minWidth: 180, defaultWidth: 260 },
  { key: 'supplier', label: 'Proveedor', minWidth: 180, defaultWidth: 220 },
] as const;

export default function ProductsList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchApi('/products')
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = Array.isArray(data) ? data : (data?.data || []);

  return <ProductsTable list={list} />;
}

function ProductsTable({ list }: { list: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { query, setQuery, filtered } = useSearch(list, ['sku', 'name', 'supplier.name']);
  const { getColumnCellSx, startResizing, resetColumnWidth } = useResizableColumns(
    'products-list',
    productColumns,
  );

  const currentIndex = filtered.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalProductId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filtered.length) {
      const newItem = filtered[newIndex];
      setModalProductId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        productId={modalProductId}
        title={modalProductId ? 'Editar Producto' : 'Crear Nuevo Producto'}
        list={filtered}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
      <ListPageToolbar>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              setModalProductId(undefined);
              setIsModalOpen(true);
            }}
            variant="contained"
            color="primary"
            disableElevation
          >
            Crear Nuevo
          </Button>
          <ListSearchField
            placeholder="Buscar por SKU, nombre o proveedor..."
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
              {productColumns.map((column) => (
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
              <TableRow><TableCell colSpan={4} align="center">No hay registros</TableCell></TableRow>
            ) : filtered.map((item: any) => {
              const rowId = String(item.id ?? '');
              return (
                <TableRow
                  key={item.id}
                  hover
                  selected={selectedRowId === rowId}
                  onClick={() => setSelectedRowId(rowId)}
                  onDoubleClick={() => {
                    setModalProductId(item.id);
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
                  <TableCell sx={getColumnCellSx('sku')}>{item.sku}</TableCell>
                  <TableCell sx={getColumnCellSx('name')}>{item.name}</TableCell>
                  <TableCell sx={getColumnCellSx('supplier')}>{item.supplier?.name || "N/A"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

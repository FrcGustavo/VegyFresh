import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TableContainer,
  CircularProgress,
  Box,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ShoppingCart } from '@mui/icons-material';
import { fetchApi } from '../../../api';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import OrderFormModal from '../components/OrderFormModal';
import ResizableHeaderCell from '../../../components/ResizableHeaderCell';
import ResourcePageTitle from '../../../components/ResourcePageTitle';
import { useListPageToolbar } from '../../../layout/useListPageToolbar';

const orderColumns = [
  { key: 'created_at', label: 'Fecha', minWidth: 180, defaultWidth: 220 },
  { key: 'delivery_date', label: 'Fecha de entrega', minWidth: 180, defaultWidth: 220 },
  { key: 'folio', label: 'Folio', minWidth: 140, defaultWidth: 180 },
  { key: 'client', label: 'Nombre del cliente', minWidth: 180, defaultWidth: 260 },
  { key: 'description', label: 'Descripción', minWidth: 220, defaultWidth: 300 },
  { key: 'total_amount', label: 'Importe total', minWidth: 140, defaultWidth: 160 },
] as const;

const PAGE_SIZE = 25;
type OrderSortField =
  | 'created_at'
  | 'delivery_date'
  | 'folio'
  | 'client'
  | 'description'
  | 'total_amount';
type SortOrder = 'asc' | 'desc';
type CreatedFilter = 'all' | 'today' | 'range';

export default function OrdersList() {
  const [sortBy, setSortBy] = useState<OrderSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['orders', sortBy, sortOrder, createdFilter, createdFrom, createdTo],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
        order_by: sortBy,
        order: sortOrder,
        created_filter: createdFilter,
      });

      if (createdFilter === 'range') {
        if (createdFrom) {
          params.set('created_from', createdFrom);
        }
        if (createdTo) {
          params.set('created_to', createdTo);
        }
      }

      return fetchApi(`/orders?${params.toString()}`);
    },
    getNextPageParam: (lastPage, allPages) => {
      const lastItems = Array.isArray(lastPage) ? lastPage : (lastPage?.data || []);
      if (lastItems.length < PAGE_SIZE) {
        return undefined;
      }

      return allPages.length * PAGE_SIZE;
    },
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = (data?.pages ?? []).flatMap((page) => (Array.isArray(page) ? page : (page?.data || [])));
  return (
    <OrdersTable
      list={list}
      sortBy={sortBy}
      sortOrder={sortOrder}
      setSortBy={setSortBy}
      setSortOrder={setSortOrder}
      createdFilter={createdFilter}
      setCreatedFilter={setCreatedFilter}
      createdFrom={createdFrom}
      setCreatedFrom={setCreatedFrom}
      createdTo={createdTo}
      setCreatedTo={setCreatedTo}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

function OrdersTable({
  list,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  createdFilter,
  setCreatedFilter,
  createdFrom,
  setCreatedFrom,
  createdTo,
  setCreatedTo,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  list: any[];
  sortBy: OrderSortField;
  sortOrder: SortOrder;
  setSortBy: (value: OrderSortField) => void;
  setSortOrder: (value: SortOrder) => void;
  createdFilter: CreatedFilter;
  setCreatedFilter: (value: CreatedFilter) => void;
  createdFrom: string;
  setCreatedFrom: (value: string) => void;
  createdTo: string;
  setCreatedTo: (value: string) => void;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOrderId, setModalOrderId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { getColumnCellSx, startResizing, resetColumnWidth } = useResizableColumns(
    'orders-list',
    orderColumns,
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const toolbarConfig = useMemo(() => ({
    createLabel: 'Crear Nuevo',
    createdFilter,
    createdFrom,
    createdTo,
    onCreatedFilterChange: setCreatedFilter,
    onCreatedFromChange: setCreatedFrom,
    onCreatedToChange: setCreatedTo,
    onCreate: () => {
      setModalOrderId(undefined);
      setIsModalOpen(true);
    },
  }), [
    createdFilter,
    createdFrom,
    createdTo,
    setCreatedFilter,
    setCreatedFrom,
    setCreatedTo,
  ]);
  useListPageToolbar(toolbarConfig);

  const currentIndex = list.findIndex(item => String(item.id ?? '') === selectedRowId);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalOrderId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < list.length) {
      const newItem = list[newIndex];
      setModalOrderId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  const handleSort = (columnKey: string) => {
    if (
      columnKey !== 'created_at' &&
      columnKey !== 'delivery_date' &&
      columnKey !== 'folio' &&
      columnKey !== 'client' &&
      columnKey !== 'description' &&
      columnKey !== 'total_amount'
    ) {
      return;
    }

    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(columnKey);
    setSortOrder('asc');
  };

  const formatDate = (value: string | null | undefined) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-MX');
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return 'N/A';
    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
      <ResourcePageTitle title="Pedidos" icon={<ShoppingCart />} />
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderId={modalOrderId}
        title={modalOrderId ? 'Editar Pedido' : 'Crear Pedido'}
        list={list}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
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
                  sortable
                  sortActive={sortBy === column.key}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No hay registros</TableCell></TableRow>
            ) : list.map((item: any) => {
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
                  <TableCell sx={getColumnCellSx('created_at')}>{formatDate(item.created_at)}</TableCell>
                  <TableCell sx={getColumnCellSx('delivery_date')}>{formatDate(item.delivery_date)}</TableCell>
                  <TableCell sx={getColumnCellSx('folio')}>{item.folio || "N/A"}</TableCell>
                  <TableCell sx={getColumnCellSx('client')}>{item.client?.name || "N/A"}</TableCell>
                  <TableCell sx={getColumnCellSx('description')}>{item.description || "N/A"}</TableCell>
                  <TableCell sx={getColumnCellSx('total_amount')}>{formatCurrency(item.total_amount)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <Box ref={sentinelRef} sx={{ height: 1 }} />
      {isFetchingNextPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}

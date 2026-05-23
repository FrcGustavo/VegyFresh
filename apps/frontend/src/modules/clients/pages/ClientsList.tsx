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
import { People } from '@mui/icons-material';
import { fetchApi } from '../../../api';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useResizableColumns } from '../../../hooks/useResizableColumns';
import ClientFormModal from '../components/ClientFormModal';
import ResizableHeaderCell from '../../../components/ResizableHeaderCell';
import ResourcePageTitle from '../../../components/ResourcePageTitle';
import { useListPageToolbar } from '../../../layout/useListPageToolbar';

const clientColumns = [
  { key: 'folio', label: 'Folio', minWidth: 140, defaultWidth: 180 },
  { key: 'name', label: 'Nombre', minWidth: 180, defaultWidth: 260 },
  { key: 'phone_number', label: 'Teléfono', minWidth: 180, defaultWidth: 220 },
] as const;

const PAGE_SIZE = 25;
type SortByField = 'folio' | 'name';
type SortOrder = 'asc' | 'desc';

export default function ClientsList() {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortByField>('folio');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const debouncedQuery = useDebouncedValue(query, 400);
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['clients', debouncedQuery, sortBy, sortOrder],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pageParam),
        order_by: sortBy,
        order: sortOrder,
      });

      if (debouncedQuery.trim()) {
        params.set('search', debouncedQuery.trim());
      }

      return fetchApi(`/clients?${params.toString()}`);
    },
    getNextPageParam: (lastPage, allPages) => {
      const lastItems = Array.isArray(lastPage) ? lastPage : (lastPage?.data ?? []);
      if (lastItems.length < PAGE_SIZE) {
        return undefined;
      }

      return allPages.length * PAGE_SIZE;
    },
    placeholderData: (previousData) => previousData,
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = (data?.pages ?? []).flatMap((page) =>
    Array.isArray(page) ? page : (page?.data ?? []),
  );

  return (
    <ClientsTable
      list={list}
      query={query}
      setQuery={setQuery}
      sortBy={sortBy}
      setSortBy={setSortBy}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

function ClientsTable({
  list,
  query,
  setQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  list: any[];
  query: string;
  setQuery: (value: string) => void;
  sortBy: SortByField;
  setSortBy: (value: SortByField) => void;
  sortOrder: SortOrder;
  setSortOrder: (value: SortOrder) => void;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { getColumnCellSx, startResizing, resetColumnWidth } = useResizableColumns(
    'clients-list',
    clientColumns,
  );
  const toolbarConfig = useMemo(() => ({
    createLabel: 'Crear Nuevo',
    searchPlaceholder: 'Buscar por nombre...',
    searchValue: query,
    onSearchChange: setQuery,
    onCreate: () => {
      setModalClientId(undefined);
      setIsModalOpen(true);
    },
  }), [query, setQuery]);
  useListPageToolbar(toolbarConfig);

  const currentIndex = list.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalClientId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < list.length) {
      const newItem = list[newIndex];
      setModalClientId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  const handleSort = (columnKey: string) => {
    if (columnKey !== 'folio' && columnKey !== 'name') {
      return;
    }

    if (sortBy === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(columnKey);
    setSortOrder('asc');
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
      <ResourcePageTitle title="Clientes" icon={<People />} />
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientId={modalClientId}
        title={modalClientId ? 'Editar Cliente' : 'Crear Cliente'}
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
              {clientColumns.map((column) => (
                <ResizableHeaderCell
                  key={column.key}
                  label={column.label}
                  columnKey={column.key}
                  cellSx={getColumnCellSx(column.key)}
                  onResizeStart={startResizing}
                  onResetWidth={resetColumnWidth}
                  sortable={column.key === 'folio' || column.key === 'name'}
                  sortActive={sortBy === column.key}
                  sortDirection={sortOrder}
                  onSort={handleSort}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={3} align="center">No hay registros</TableCell></TableRow>
            ) : list.map((item: any) => {
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
                  <TableCell sx={getColumnCellSx('folio')}>{item.folio ?? 'N/A'}</TableCell>
                  <TableCell sx={getColumnCellSx('name')}>{item.name}</TableCell>
                  <TableCell sx={getColumnCellSx('phone_number')}>{item.phone_number}</TableCell>
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

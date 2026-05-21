import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper, TableContainer, CircularProgress, Box, Container } from '@mui/material';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '../../../api';
import { useSearch } from '../../../hooks/useSearch';
import UserFormModal from '../components/UserFormModal';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ListSearchField from '../../../components/ListSearchField';

export default function UsersList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchApi('/users')
  });

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (error) return <Typography color="error">Error al cargar: {(error as Error).message}</Typography>;

  const list = Array.isArray(data) ? data : (data?.data || []);

  return <UsersTable list={list} />;
}

function UsersTable({ list }: { list: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserId, setModalUserId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const { query, setQuery, filtered } = useSearch(list, ['name', 'email']);

  const currentIndex = filtered.findIndex(item => String(item.id ?? '') === selectedRowId);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalUserId(undefined);
  };

  const handleNavigateItem = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < filtered.length) {
      const newItem = filtered[newIndex];
      setModalUserId(newItem.id);
      setSelectedRowId(String(newItem.id ?? ''));
    }
  };

  return (
    <div>
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userId={modalUserId}
        title={modalUserId ? 'Editar Usuario' : 'Crear Usuario'}
        list={filtered}
        currentIndex={currentIndex}
        onNavigate={handleNavigateItem}
      />
      <ListPageToolbar>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            onClick={() => {
              setModalUserId(undefined);
              setIsModalOpen(true);
            }}
            variant="contained"
            color="primary"
          >
            Crear Nuevo
          </Button>
          <ListSearchField
            placeholder="Buscar por nombre o email..."
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
                <TableCell>Email</TableCell>
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
                      setModalUserId(item.id);
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
                    <TableCell>{item.email}</TableCell>
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

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Warehouse as WarehouseIcon } from '@mui/icons-material';
import { fetchApi } from '../../../api';
import ListPageToolbar from '../../../components/ListPageToolbar';
import ResourcePageTitle from '../../../components/ResourcePageTitle';
import PurchaseFormModal from '../components/PurchaseFormModal';

type ProductInventoryItem = {
  id: string;
  folio?: string | null;
  name?: string | null;
  stock?: number | string | null;
  unit?: string | null;
  supplier?: { name?: string | null } | null;
};

type PurchaseItem = {
  id: string;
  folio?: string | null;
  purchase_date?: string | null;
  total_amount?: number | string | null;
  supplier?: { name?: string | null } | null;
};

type MovementItem = {
  id: string;
  created_at?: string | null;
  movement_type?: string | null;
  quantity?: number | string | null;
  previous_stock?: number | string | null;
  new_stock?: number | string | null;
  reason?: string | null;
  product?: { name?: string | null; unit?: string | null } | null;
  purchase?: { folio?: string | null } | null;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('es-MX');
};

const formatCurrency = (value: number | string | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'N/A';
  return amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });
};

const formatQuantity = (value: number | string | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0.000';
  return amount.toFixed(3);
};

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const inventoryQuery = useQuery({
    queryKey: ['warehouse', 'inventory'],
    queryFn: () => fetchApi('/inventory'),
  });
  const purchasesQuery = useQuery({
    queryKey: ['warehouse', 'purchases'],
    queryFn: () => fetchApi('/purchases'),
  });
  const movementsQuery = useQuery({
    queryKey: ['warehouse', 'movements'],
    queryFn: () => fetchApi('/inventory/movements'),
  });

  const isLoading =
    inventoryQuery.isLoading || purchasesQuery.isLoading || movementsQuery.isLoading;
  const error =
    inventoryQuery.error ?? purchasesQuery.error ?? movementsQuery.error;

  const inventory = useMemo(
    () =>
      (Array.isArray(inventoryQuery.data)
        ? inventoryQuery.data
        : (inventoryQuery.data?.data ?? [])) as ProductInventoryItem[],
    [inventoryQuery.data],
  );
  const purchases = useMemo(
    () =>
      (Array.isArray(purchasesQuery.data)
        ? purchasesQuery.data
        : (purchasesQuery.data?.data ?? [])) as PurchaseItem[],
    [purchasesQuery.data],
  );
  const movements = useMemo(
    () =>
      (Array.isArray(movementsQuery.data)
        ? movementsQuery.data
        : (movementsQuery.data?.data ?? [])) as MovementItem[],
    [movementsQuery.data],
  );

  const toolbarConfig =
    activeTab === 1
      ? {
          createLabel: 'Registrar Compra',
          onCreate: () => setIsPurchaseModalOpen(true),
        }
      : null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error">
        Error al cargar: {(error as Error).message}
      </Typography>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'background.paper' }}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Almacén" icon={<WarehouseIcon />} />

      <Tabs
        value={activeTab}
        onChange={(_event, value: number) => setActiveTab(value)}
        sx={{ px: 1 }}
      >
        <Tab label="Inventario" />
        <Tab label="Compras" />
        <Tab label="Movimientos" />
      </Tabs>

      {activeTab === 0 && (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Unidad</TableCell>
                <TableCell>Stock actual</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name ?? 'N/A'}</TableCell>
                    <TableCell>{item.supplier?.name ?? 'N/A'}</TableCell>
                    <TableCell>{(item.unit ?? 'pz').toUpperCase()}</TableCell>
                    <TableCell>{formatQuantity(item.stock)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Folio</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                    <TableCell>{purchase.folio ?? 'N/A'}</TableCell>
                    <TableCell>{purchase.supplier?.name ?? 'N/A'}</TableCell>
                    <TableCell>{formatCurrency(purchase.total_amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 2 && (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Stock anterior</TableCell>
                <TableCell>Stock nuevo</TableCell>
                <TableCell>Folio compra</TableCell>
                <TableCell>Motivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDate(movement.created_at)}</TableCell>
                    <TableCell>{movement.movement_type ?? 'N/A'}</TableCell>
                    <TableCell>{movement.product?.name ?? 'N/A'}</TableCell>
                    <TableCell>
                      {`${formatQuantity(movement.quantity)} ${(movement.product?.unit ?? '').toUpperCase()}`}
                    </TableCell>
                    <TableCell>{formatQuantity(movement.previous_stock)}</TableCell>
                    <TableCell>{formatQuantity(movement.new_stock)}</TableCell>
                    <TableCell>{movement.purchase?.folio ?? 'N/A'}</TableCell>
                    <TableCell>{movement.reason ?? 'N/A'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <PurchaseFormModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['warehouse', 'inventory'] });
          queryClient.invalidateQueries({ queryKey: ['warehouse', 'purchases'] });
          queryClient.invalidateQueries({ queryKey: ['warehouse', 'movements'] });
        }}
      />
    </Box>
  );
}

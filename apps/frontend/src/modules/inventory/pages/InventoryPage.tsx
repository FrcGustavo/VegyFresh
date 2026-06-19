import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "@mui/material";
import { Warehouse as WarehouseIcon } from "@mui/icons-material";
import {
  inventoryQueryOptions,
  purchasesQueryOptions,
} from "../../../api";
import ListPageToolbar from "../../../components/ListPageToolbar";
import ResourcePageTitle from "../../../components/ResourcePageTitle";
import PurchaseFormModal from "../components/PurchaseFormModal";

type ProductInventoryItem = {
  id: string;
  folio?: string | null;
  name?: string | null;
  stock?: number | string | null;
  unit?: string | null;
  supplier?: { name?: string | null } | null;
};

type PurchaseLineItem = {
  subtotal?: number | string | null;
};

type PurchaseItem = {
  id: string;
  folio?: string | null;
  purchase_date?: string | null;
  items?: PurchaseLineItem[] | null;
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
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString("es-MX");
};

const formatCurrency = (value: number | string | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "N/A";
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
};

const formatQuantity = (value: number | string | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.000";
  return amount.toFixed(3);
};

const purchaseTotal = (items: PurchaseLineItem[] | null | undefined) =>
  (items ?? []).reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0);

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const inventoryQuery = useQuery(inventoryQueryOptions.stock());
  const purchasesQuery = useQuery(purchasesQueryOptions.list());
  const movementsQuery = useQuery(inventoryQueryOptions.movements());

  const isLoading =
    inventoryQuery.isLoading ||
    purchasesQuery.isLoading ||
    movementsQuery.isLoading;
  const error =
    inventoryQuery.error ?? purchasesQuery.error ?? movementsQuery.error;

  const inventory = useMemo(
    () => (inventoryQuery.data ?? []) as ProductInventoryItem[],
    [inventoryQuery.data],
  );
  const purchases = useMemo(
    () => (purchasesQuery.data ?? []) as PurchaseItem[],
    [purchasesQuery.data],
  );
  const movements = useMemo(
    () => (movementsQuery.data ?? []) as MovementItem[],
    [movementsQuery.data],
  );

  const toolbarConfig =
    activeTab === 1
      ? {
          createLabel: "Registrar Compra",
          onCreate: () => setIsPurchaseModalOpen(true),
        }
      : null;

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
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
    <Box sx={{ backgroundColor: "background.paper" }}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Inventario" icon={<WarehouseIcon />} />

      <Tabs
        value={activeTab}
        onChange={(_event, value: number) => setActiveTab(value)}
        sx={{ px: 1 }}
      >
        <Tab label="Inventario" />
        <Tab label="Entradas" />
        <Tab label="Movimientos" />
      </Tabs>

      {activeTab === 0 && (
        <TableContainer sx={{ maxHeight: "calc(100vh - 180px)" }}>
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
                    <TableCell>{item.name ?? "N/A"}</TableCell>
                    <TableCell>{item.supplier?.name ?? "N/A"}</TableCell>
                    <TableCell>{(item.unit ?? "pz").toUpperCase()}</TableCell>
                    <TableCell>{formatQuantity(item.stock)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 1 && (
        <TableContainer sx={{ maxHeight: "calc(100vh - 180px)" }}>
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
                    <TableCell>{purchase.folio ?? "N/A"}</TableCell>
                    <TableCell>{purchase.supplier?.name ?? "N/A"}</TableCell>
                    <TableCell>
                      {formatCurrency(purchaseTotal(purchase.items))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {activeTab === 2 && (
        <TableContainer sx={{ maxHeight: "calc(100vh - 180px)" }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Producto</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Stock anterior</TableCell>
                <TableCell>Stock nuevo</TableCell>
                <TableCell>Folio entrada</TableCell>
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
                    <TableCell>{movement.movement_type ?? "N/A"}</TableCell>
                    <TableCell>{movement.product?.name ?? "N/A"}</TableCell>
                    <TableCell>
                      {`${formatQuantity(movement.quantity)} ${(movement.product?.unit ?? "").toUpperCase()}`}
                    </TableCell>
                    <TableCell>
                      {formatQuantity(movement.previous_stock)}
                    </TableCell>
                    <TableCell>{formatQuantity(movement.new_stock)}</TableCell>
                    <TableCell>{movement.purchase?.folio ?? "N/A"}</TableCell>
                    <TableCell>{movement.reason ?? "N/A"}</TableCell>
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
        onSuccess={() => undefined}
      />
    </Box>
  );
}

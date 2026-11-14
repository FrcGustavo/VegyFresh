import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, CircularProgress, Typography } from "@mui/material";
import { Warehouse as WarehouseIcon } from "@mui/icons-material";
import { inventoryQueryOptions } from "../../../api";
import ResourcePageTitle from "../../../components/ResourcePageTitle";
import { Table } from "../../../components/Table";
import type { ColumnConfig } from "../../../components/Table";

type ProductInventoryItem = {
  id: string;
  folio?: string | null;
  name?: string | null;
  stock?: number | string | null;
  unit?: string | null;
  supplier?: { name?: string | null } | null;
};

const INVENTORY_COLUMNS = [
  {
    key: "name",
    label: "Producto",
    minWidth: 180,
    defaultWidth: 280,
    sortable: false,
  },
  {
    key: "supplier",
    label: "Proveedor",
    minWidth: 180,
    defaultWidth: 260,
    sortable: false,
  },
  {
    key: "unit",
    label: "Unidad",
    minWidth: 100,
    defaultWidth: 140,
    sortable: false,
  },
  {
    key: "stock",
    label: "Stock actual",
    minWidth: 130,
    defaultWidth: 170,
    sortable: false,
  },
] as const;

const formatQuantity = (value: number | string | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.000";
  return amount.toFixed(3);
};

export default function InventoryPage() {
  const inventoryQuery = useQuery(inventoryQueryOptions.stock());
  const inventory = useMemo(
    () => (inventoryQuery.data ?? []) as ProductInventoryItem[],
    [inventoryQuery.data],
  );

  if (inventoryQuery.isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (inventoryQuery.error) {
    return (
      <Typography color="error">
        Error al cargar: {(inventoryQuery.error as Error).message}
      </Typography>
    );
  }

  const renderCell = (column: ColumnConfig, item: ProductInventoryItem) => {
    switch (column.key) {
      case "name":
        return item.name ?? "N/A";
      case "supplier":
        return item.supplier?.name ?? "N/A";
      case "unit":
        return (item.unit ?? "pz").toUpperCase();
      case "stock":
        return formatQuantity(item.stock);
      default:
        return "N/A";
    }
  };

  return (
    <Box sx={{ backgroundColor: "background.paper" }}>
      <ResourcePageTitle title="Inventario" icon={<WarehouseIcon />} />
      <Table
        columns={INVENTORY_COLUMNS}
        data={inventory}
        keyExtractor={(item) => item.id}
        renderCell={renderCell}
        resizableColumnsStorageKey="inventory-list"
      />
    </Box>
  );
}

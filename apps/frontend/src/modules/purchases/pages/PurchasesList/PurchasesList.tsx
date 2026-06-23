import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReceiptLong } from "@mui/icons-material";
import { Box, CircularProgress, Typography } from "@mui/material";
import { purchasesQueryOptions } from "../../../../api";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import { Table } from "../../../../components/Table";
import type { ColumnConfig } from "../../../../components/Table";
import PurchaseFormModal from "../../components/PurchaseFormModal";
import { PURCHASE_COLUMNS } from "./PurchasesList.constants";
import {
  usePurchaseFormatters,
  usePurchasesSort,
  usePurchasesTableState,
} from "./PurchasesList.hooks";
import type {
  PurchaseListItem,
  PurchaseSortField,
} from "./PurchasesList.types";

const purchaseTotal = (purchase: PurchaseListItem) =>
  (purchase.items ?? []).reduce(
    (sum, item) => sum + Number(item.subtotal ?? 0),
    0,
  );

const getSortValue = (
  purchase: PurchaseListItem,
  sortBy: PurchaseSortField,
) => {
  switch (sortBy) {
    case "purchase_date":
      return new Date(purchase.purchase_date ?? 0).getTime();
    case "folio":
      return purchase.folio ?? "";
    case "supplier":
      return purchase.supplier?.name ?? "";
    case "total":
      return purchaseTotal(purchase);
    case "notes":
      return purchase.notes ?? "";
    default:
      return "";
  }
};

export default function PurchasesList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = usePurchasesSort();
  const { data, isLoading, error } = useQuery(purchasesQueryOptions.list());

  const list = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const purchases = (data ?? []) as PurchaseListItem[];
    const filtered = normalizedQuery
      ? purchases.filter((purchase) =>
          [
            purchase.folio,
            purchase.supplier?.name,
            purchase.notes,
            purchase.purchase_date,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedQuery),
            ),
        )
      : purchases;

    return [...filtered].sort((first, second) => {
      const firstValue = getSortValue(first, sortBy);
      const secondValue = getSortValue(second, sortBy);
      const direction = sortOrder === "asc" ? 1 : -1;

      if (typeof firstValue === "number" && typeof secondValue === "number") {
        return (firstValue - secondValue) * direction;
      }

      return String(firstValue).localeCompare(String(secondValue)) * direction;
    });
  }, [data, query, sortBy, sortOrder]);

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
    <PurchasesTableView
      list={list}
      query={query}
      setQuery={setQuery}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
    />
  );
}

function PurchasesTableView({
  list,
  query,
  setQuery,
  sortBy,
  sortOrder,
  onSort,
}: {
  list: PurchaseListItem[];
  query: string;
  setQuery: (value: string) => void;
  sortBy: PurchaseSortField;
  sortOrder: "asc" | "desc";
  onSort: (columnKey: string) => void;
}) {
  const {
    isModalOpen,
    modalPurchaseId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = usePurchasesTableState();
  const { formatDate, formatCurrency } = usePurchaseFormatters();

  const currentIndex = list.findIndex(
    (item) => String(item.id ?? "") === selectedRowId,
  );
  const toolbarConfig = useMemo(
    () => ({
      createLabel: "Crear Nuevo",
      searchPlaceholder: "Buscar por folio, proveedor o notas...",
      searchValue: query,
      onSearchChange: setQuery,
      onCreate: () => handleOpenModal(undefined),
    }),
    [handleOpenModal, query, setQuery],
  );

  const renderCell = (column: ColumnConfig, item: PurchaseListItem) => {
    switch (column.key) {
      case "purchase_date":
        return formatDate(item.purchase_date);
      case "folio":
        return item.folio ?? "N/A";
      case "supplier":
        return item.supplier?.name ?? "N/A";
      case "total":
        return formatCurrency(purchaseTotal(item));
      case "notes":
        return item.notes || "N/A";
      default:
        return "N/A";
    }
  };

  return (
    <Box sx={{ backgroundColor: "background.paper" }}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Compras" icon={<ReceiptLong />} />
      <PurchaseFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        purchaseId={modalPurchaseId}
        title={modalPurchaseId ? "Editar compra" : "Crear compra"}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={PURCHASE_COLUMNS}
        data={list}
        keyExtractor={(item) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        selectedRowId={selectedRowId}
        onRowSelect={handleSelectRow}
        onRowDoubleClick={(id) => {
          handleSelectRow(String(id));
          handleOpenModal(String(id));
        }}
        renderCell={renderCell}
        resizableColumnsStorageKey="purchases-list"
      />
    </Box>
  );
}

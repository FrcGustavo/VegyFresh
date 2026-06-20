import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LocalShipping } from "@mui/icons-material";
import { suppliersQueryOptions } from "../../../../api";
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";
import { Table } from "../../../../components/Table";
import SupplierFormModal from "../../components/SupplierFormModal";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import {
  useSuppliersSort,
  useSuppliersTableState,
} from "./SuppliersList.hooks";
import { SUPPLIERS_PAGE_SIZE, SUPPLIER_COLUMNS } from "./SuppliersList.constants";
import { suppliersListStyles } from "./SuppliersList.styles";
import type { SupplierListItem, SortByField, SortOrder } from "./SuppliersList.types";

export default function SuppliersList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = useSuppliersSort();
  const debouncedQuery = useDebouncedValue(query, 400);
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...suppliersQueryOptions.infiniteList({
      limit: String(SUPPLIERS_PAGE_SIZE),
      order_by: sortBy,
      order: sortOrder,
      search: debouncedQuery.trim() || undefined,
    }),
    placeholderData: (previousData) => previousData,
  });

  if (isLoading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  if (error)
    return (
      <Typography color="error">
        Error al cargar: {(error as Error).message}
      </Typography>
    );

  const list = (data?.pages ?? []).flatMap((page) =>
    Array.isArray(page) ? page : (page?.data ?? []),
  );

  return (
    <SuppliersTable
      list={list}
      query={query}
      setQuery={setQuery}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

function SuppliersTable({
  list,
  query,
  setQuery,
  sortBy,
  sortOrder,
  onSort,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  list: SupplierListItem[];
  query: string;
  setQuery: (value: string) => void;
  sortBy: SortByField;
  sortOrder: SortOrder;
  onSort: (columnKey: string) => void;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    isModalOpen,
    modalSupplierId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = useSuppliersTableState();
  const toolbarConfig = useMemo(
    () => ({
      createLabel: "Crear Nuevo",
      searchPlaceholder: "Buscar por nombre...",
      searchValue: query,
      onSearchChange: setQuery,
      onCreate: () => {
        handleOpenModal(undefined);
      },
    }),
    [query, setQuery, handleOpenModal],
  );

  const currentIndex = list.findIndex(
    (item) => String(item.id ?? "") === selectedRowId,
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <Box sx={suppliersListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Provedores" icon={<LocalShipping />} />
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplierId={modalSupplierId}
        title={modalSupplierId ? "Editar Proveedor" : "Crear Proveedor"}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={SUPPLIER_COLUMNS}
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
        renderCell={(column, item) => {
          if (column.key === "folio") return item.folio ?? "N/A";
          if (column.key === "name") return item.name ?? "N/A";
          if (column.key === "email") return item.email ?? "N/A";
          return item.phone_number ?? "N/A";
        }}
        resizableColumnsStorageKey="suppliers-list"
      />
      <Box ref={sentinelRef} sx={{ height: 1 }} />
      {isFetchingNextPage && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
}

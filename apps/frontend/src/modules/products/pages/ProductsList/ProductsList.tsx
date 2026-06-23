import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Inventory } from "@mui/icons-material";
import { Box, Typography, CircularProgress } from "@mui/material";
import { productsQueryOptions } from "../../../../api";
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";
import { Table } from "../../../../components/Table";
import type { ColumnConfig } from "../../../../components/Table";
import ProductFormModal from "../../components/ProductFormModal";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import { useProductsTableState, useProductsSort } from "./ProductsList.hooks";
import { productsListStyles } from "./ProductsList.styles";
import { PRODUCT_COLUMNS, PRODUCTS_PAGE_SIZE } from "./ProductsList.constants";
import type {
  ProductListItem,
  SortByField,
  SortOrder,
} from "./ProductsList.types";

export default function ProductsList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = useProductsSort();
  const debouncedQuery = useDebouncedValue(query, 400);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...productsQueryOptions.infiniteList({
      limit: String(PRODUCTS_PAGE_SIZE),
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
    <ProductsTableView
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

function ProductsTableView({
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
  list: ProductListItem[];
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
    modalProductId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = useProductsTableState();

  const currentIndex = list.findIndex(
    (item) => String(item.id ?? "") === selectedRowId,
  );

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

  const renderCell = (column: ColumnConfig, item: ProductListItem) => {
    switch (column.key) {
      case "folio":
        return item.folio || "N/A";
      case "name":
        return item.name ?? "N/A";
      case "unit":
        return item.unit || "N/A";
      default:
        return "N/A";
    }
  };

  return (
    <Box sx={productsListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Productos" icon={<Inventory />} />
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        productId={modalProductId}
        title={modalProductId ? "Editar Producto" : "Crear Nuevo Producto"}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={PRODUCT_COLUMNS}
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
        resizableColumnsStorageKey="products-list"
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

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { LocalOffer } from "@mui/icons-material";
import { Box, Typography, CircularProgress } from "@mui/material";
import { priceListsQueryOptions } from "../../../../api";
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";
import { Table } from "../../../../components/Table";
import PriceListFormModal from "../../components/PriceListFormModal";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import { usePriceListsTableState, usePriceListsSort } from "./PriceListsList.hooks";
import { priceListsListStyles } from "./PriceListsList.styles";
import { PRICE_LIST_COLUMNS, PRICE_LISTS_PAGE_SIZE } from "./PriceListsList.constants";
import type { PriceListItem, SortByField, SortOrder } from "./PriceListsList.types";

export default function PriceListsList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = usePriceListsSort();
  const debouncedQuery = useDebouncedValue(query, 400);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...priceListsQueryOptions.infiniteList({
      limit: String(PRICE_LISTS_PAGE_SIZE),
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
    <PriceListsTableView
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

function PriceListsTableView({
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
  list: PriceListItem[];
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
    modalPriceListId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = usePriceListsTableState();

  const currentIndex = list.findIndex(
    (item) => String(item.id ?? "") === selectedRowId,
  );

  const toolbarConfig = useMemo(
    () => ({
      createLabel: "Crear Nueva",
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

  return (
    <Box sx={priceListsListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Listas de precio" icon={<LocalOffer />} />
      <PriceListFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        priceListId={modalPriceListId}
        title={
          modalPriceListId
            ? "Editar Lista de Precios"
            : "Crear Lista de Precios"
        }
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={PRICE_LIST_COLUMNS}
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
          return "N/A";
        }}
        resizableColumnsStorageKey="price-lists-list"
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

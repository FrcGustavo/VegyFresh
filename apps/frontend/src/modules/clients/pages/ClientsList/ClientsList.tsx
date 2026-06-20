import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { People } from "@mui/icons-material";
import { clientsQueryOptions } from "../../../api";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { Table } from "../../../components/Table";
import ClientFormModal from "../components/ClientFormModal";
import ResourcePageTitle from "../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../components/ListPageToolbar";
import {
  useClientsSort,
  useClientsTableState,
} from "./ClientsList.hooks";
import { CLIENTS_PAGE_SIZE, CLIENT_COLUMNS } from "./ClientsList.constants";
import { clientsListStyles } from "./ClientsList.styles";
import type { ClientListItem, SortByField, SortOrder } from "./ClientsList.types";

export default function ClientsList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = useClientsSort();
  const debouncedQuery = useDebouncedValue(query, 400);
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...clientsQueryOptions.infiniteList({
      limit: String(CLIENTS_PAGE_SIZE),
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
    <ClientsTable
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

function ClientsTable({
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
  list: ClientListItem[];
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
    modalClientId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = useClientsTableState();
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
    <Box sx={clientsListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Clientes" icon={<People />} />
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        clientId={modalClientId}
        title={modalClientId ? "Editar Cliente" : "Crear Cliente"}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={CLIENT_COLUMNS}
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
          return item.phone_number ?? "N/A";
        }}
        resizableColumnsStorageKey="clients-list"
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

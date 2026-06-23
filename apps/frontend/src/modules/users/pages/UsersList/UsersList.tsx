import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AdminPanelSettings } from "@mui/icons-material";
import { usersQueryOptions } from "../../../../api";
import { useDebouncedValue } from "../../../../hooks/useDebouncedValue";
import { Table } from "../../../../components/Table";
import UserFormModal from "../../components/UserFormModal";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import { useUsersSort, useUsersTableState } from "./UsersList.hooks";
import { USERS_PAGE_SIZE, USER_COLUMNS } from "./UsersList.constants";
import { usersListStyles } from "./UsersList.styles";
import type { UserListItem, SortByField, SortOrder } from "./UsersList.types";

export default function UsersList() {
  const [query, setQuery] = useState("");
  const { sortBy, sortOrder, handleSort } = useUsersSort();
  const debouncedQuery = useDebouncedValue(query, 400);
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    ...usersQueryOptions.infiniteList({
      limit: String(USERS_PAGE_SIZE),
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

  const list: UserListItem[] = (data?.pages ?? []).flatMap((page) =>
    Array.isArray(page)
      ? page
      : ((page as { data?: UserListItem[] })?.data ?? []),
  );

  return (
    <UsersTable
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

function UsersTable({
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
  list: UserListItem[];
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
    modalUserId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = useUsersTableState();
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
    <Box sx={usersListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle
        title="Usuarios y roles"
        icon={<AdminPanelSettings />}
      />
      <UserFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        userId={modalUserId}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={USER_COLUMNS}
        data={list}
        keyExtractor={(item: UserListItem) => item.id}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        selectedRowId={selectedRowId}
        onRowSelect={handleSelectRow}
        onRowDoubleClick={(id: string) => {
          handleSelectRow(String(id));
          handleOpenModal(String(id));
        }}
        renderCell={(column, item: UserListItem) => {
          if (column.key === "folio") return item.folio ?? "N/A";
          if (column.key === "name") return item.name ?? "N/A";
          return item.email ?? "N/A";
        }}
        resizableColumnsStorageKey="users-list"
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

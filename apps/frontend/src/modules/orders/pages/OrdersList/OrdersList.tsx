import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ShoppingCart } from "@mui/icons-material";
import { Box, Typography, CircularProgress } from "@mui/material";
import { ordersQueryOptions } from "../../../../api";
import { Table } from "../../../../components/Table";
import OrderFormModal from "../../components/OrderFormModal";
import ResourcePageTitle from "../../../../components/ResourcePageTitle";
import ListPageToolbar from "../../../../components/ListPageToolbar";
import {
  useOrdersTableState,
  useOrdersSort,
  useFormatters,
} from "./OrdersList.hooks";
import { ordersListStyles } from "./OrdersList.styles";
import { ORDER_COLUMNS, ORDERS_PAGE_SIZE } from "./OrdersList.constants";
import type {
  OrderListItem,
  CreatedFilter,
  OrderSortField,
  SortOrder,
} from "./OrdersList.types";

export default function OrdersList() {
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const { sortBy, sortOrder, handleSort } = useOrdersSort();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    ordersQueryOptions.infiniteList({
      limit: ORDERS_PAGE_SIZE,
      order_by: sortBy,
      order: sortOrder,
      created_filter: createdFilter,
      created_from:
        createdFilter === "range" ? createdFrom || undefined : undefined,
      created_to:
        createdFilter === "range" ? createdTo || undefined : undefined,
    }),
  );

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
    Array.isArray(page) ? page : page?.data || [],
  );

  return (
    <OrdersTableView
      list={list}
      createdFilter={createdFilter}
      setCreatedFilter={setCreatedFilter}
      createdFrom={createdFrom}
      setCreatedFrom={setCreatedFrom}
      createdTo={createdTo}
      setCreatedTo={setCreatedTo}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    />
  );
}

function OrdersTableView({
  list,
  sortBy,
  sortOrder,
  onSort,
  createdFilter,
  setCreatedFilter,
  createdFrom,
  setCreatedFrom,
  createdTo,
  setCreatedTo,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: {
  list: OrderListItem[];
  sortBy: OrderSortField;
  sortOrder: SortOrder;
  onSort: (columnKey: string) => void;
  createdFilter: CreatedFilter;
  setCreatedFilter: (value: CreatedFilter) => void;
  createdFrom: string;
  setCreatedFrom: (value: string) => void;
  createdTo: string;
  setCreatedTo: (value: string) => void;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
}) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    isModalOpen,
    modalOrderId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  } = useOrdersTableState();
  const { formatDate, formatCurrency } = useFormatters();

  const currentIndex = list.findIndex(
    (item) => String(item.id ?? "") === selectedRowId,
  );

  const toolbarConfig = useMemo(
    () => ({
      createLabel: "Crear Nuevo",
      createdFilter,
      createdFrom,
      createdTo,
      onCreatedFilterChange: setCreatedFilter,
      onCreatedFromChange: setCreatedFrom,
      onCreatedToChange: setCreatedTo,
      onCreate: () => {
        handleOpenModal(undefined);
      },
    }),
    [createdFilter, createdFrom, createdTo, setCreatedFilter, setCreatedFrom, setCreatedTo, handleOpenModal],
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
    <Box sx={ordersListStyles.pageContainer}>
      <ListPageToolbar config={toolbarConfig} />
      <ResourcePageTitle title="Pedidos" icon={<ShoppingCart />} />
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        orderId={modalOrderId}
        title={modalOrderId ? "Editar Pedido" : "Crear Pedido"}
        list={list}
        currentIndex={currentIndex}
        onNavigate={(newIndex: number) => handleNavigateItem(newIndex, list)}
      />
      <Table
        columns={ORDER_COLUMNS}
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
          switch (column.key) {
            case "created_at":
              return formatDate(item.created_at);
            case "delivery_date":
              return formatDate(item.delivery_date);
            case "folio":
              return item.folio ?? "N/A";
            case "client":
              return item.client?.name ?? "N/A";
            case "description":
              return item.description ?? "N/A";
            case "total_amount":
              return formatCurrency(item.total_amount);
            default:
              return "N/A";
          }
        }}
        resizableColumnsStorageKey="orders-list"
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

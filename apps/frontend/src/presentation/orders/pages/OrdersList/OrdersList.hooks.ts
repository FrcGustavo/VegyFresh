import { ORDERS_INITIAL_FIELD, ORDERS_INITIAL_ORDER } from "@/application/query/listDefaults";
import { useCallback, useState } from "react";
import type { OrderSortField, SortOrder } from "./OrdersList.types";

export const useOrdersTableState = () => {
  type NavigableItem = { id?: string | number };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOrderId, setModalOrderId] = useState<string | undefined>(
    undefined,
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalOrderId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalOrderId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback(
    (newIndex: number, items: NavigableItem[]) => {
      if (newIndex >= 0 && newIndex < items.length) {
        const newItem = items[newIndex];
        setModalOrderId(String(newItem.id));
        setSelectedRowId(String(newItem.id ?? ""));
      }
    },
    [],
  );

  return {
    isModalOpen,
    modalOrderId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const useOrdersSort = (
  initialField: OrderSortField = ORDERS_INITIAL_FIELD,
  initialOrder: SortOrder = ORDERS_INITIAL_ORDER,
) => {
  const [sortBy, setSortBy] = useState<OrderSortField>(initialField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSort = useCallback((columnKey: string) => {
    const validKeys: OrderSortField[] = [
      "created_at",
      "delivery_date",
      "folio",
      "client",
      "description",
      "total_amount",
    ];
    if (!validKeys.includes(columnKey as OrderSortField)) {
      return;
    }

    setSortBy((prev) => {
      const newSortBy = columnKey as OrderSortField;
      if (prev === newSortBy) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prev;
      }

      setSortOrder("asc");
      return newSortBy;
    });
  }, []);

  return {
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    handleSort,
  };
};

export const useFormatters = () => {
  const formatDate = useCallback((value: string | null | undefined) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString("es-MX", { timeZone: "UTC" });
  }, []);

  const formatCurrency = useCallback(
    (value: number | string | null | undefined) => {
      const amount = Number(value);
      if (!Number.isFinite(amount)) return "N/A";
      return amount.toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
      });
    },
    [],
  );

  return { formatDate, formatCurrency };
};

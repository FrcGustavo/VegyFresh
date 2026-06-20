import { useCallback, useState } from "react";
import type { SortByField, SortOrder } from "./ClientsList.types";

export const useClientsTableState = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalClientId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalClientId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback((newIndex: number, items: { id: string | number }[]) => {
    if (newIndex >= 0 && newIndex < items.length) {
      const newItem = items[newIndex];
      setModalClientId(String(newItem.id));
      setSelectedRowId(String(newItem.id ?? ""));
    }
  }, []);

  return {
    isModalOpen,
    modalClientId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const useClientsSort = (
  initialField: SortByField = "folio",
  initialOrder: SortOrder = "asc",
) => {
  const [sortBy, setSortBy] = useState<SortByField>(initialField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSort = useCallback((columnKey: string) => {
    if (columnKey !== "folio" && columnKey !== "name") {
      return;
    }

    setSortBy((prev) => {
      const next = columnKey as SortByField;
      if (prev === next) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prev;
      }

      setSortOrder("asc");
      return next;
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

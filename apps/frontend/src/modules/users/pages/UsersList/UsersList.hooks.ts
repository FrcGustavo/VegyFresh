import { useCallback, useState } from "react";
import type { SortByField, SortOrder } from "./UsersList.types";

export const useUsersTableState = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUserId, setModalUserId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalUserId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalUserId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback((newIndex: number, items: { id: string | number }[]) => {
    if (newIndex >= 0 && newIndex < items.length) {
      const newItem = items[newIndex];
      setModalUserId(String(newItem.id));
      setSelectedRowId(String(newItem.id ?? ""));
    }
  }, []);

  return {
    isModalOpen,
    modalUserId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const useUsersSort = (
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

import { useCallback, useState } from "react";
import type { SortByField, SortOrder } from "./SuppliersList.types";

export const useSuppliersTableState = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSupplierId, setModalSupplierId] = useState<string | undefined>(undefined);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalSupplierId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalSupplierId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback((newIndex: number, items: { id: string | number }[]) => {
    if (newIndex >= 0 && newIndex < items.length) {
      const newItem = items[newIndex];
      setModalSupplierId(String(newItem.id));
      setSelectedRowId(String(newItem.id ?? ""));
    }
  }, []);

  return {
    isModalOpen,
    modalSupplierId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const useSuppliersSort = (
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

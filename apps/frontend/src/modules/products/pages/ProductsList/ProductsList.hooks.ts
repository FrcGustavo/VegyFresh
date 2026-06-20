import { useCallback, useState } from "react";
import type { SortByField, SortOrder } from "./ProductsList.types";

export const useProductsTableState = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProductId, setModalProductId] = useState<string | undefined>(
    undefined,
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalProductId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalProductId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback(
    (newIndex: number, items: any[]) => {
      if (newIndex >= 0 && newIndex < items.length) {
        const newItem = items[newIndex];
        setModalProductId(String(newItem.id));
        setSelectedRowId(String(newItem.id ?? ""));
      }
    },
    []
  );

  return {
    isModalOpen,
    modalProductId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const useProductsSort = (
  initialField: SortByField = "folio",
  initialOrder: SortOrder = "asc"
) => {
  const [sortBy, setSortBy] = useState<SortByField>(initialField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSort = useCallback((columnKey: string) => {
    if (columnKey !== "folio" && columnKey !== "name" && columnKey !== "unit") {
      return;
    }

    setSortBy((prev) => {
      const newSortBy = columnKey as SortByField;
      if (prev === newSortBy) {
        setSortOrder((prevOrder) =>
          prevOrder === "asc" ? "desc" : "asc"
        );
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

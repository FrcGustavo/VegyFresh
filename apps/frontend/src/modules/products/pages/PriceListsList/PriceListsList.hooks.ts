import { useCallback, useState } from "react";
import type { SortByField, SortOrder } from "./PriceListsList.types";

export const usePriceListsTableState = () => {
  type NavigableItem = { id?: string | number };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPriceListId, setModalPriceListId] = useState<string | undefined>(
    undefined,
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalPriceListId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalPriceListId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback(
    (newIndex: number, items: NavigableItem[]) => {
      if (newIndex >= 0 && newIndex < items.length) {
        const newItem = items[newIndex];
        setModalPriceListId(String(newItem.id));
        setSelectedRowId(String(newItem.id ?? ""));
      }
    },
    [],
  );

  return {
    isModalOpen,
    modalPriceListId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const usePriceListsSort = (
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
      const newSortBy = columnKey as SortByField;
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

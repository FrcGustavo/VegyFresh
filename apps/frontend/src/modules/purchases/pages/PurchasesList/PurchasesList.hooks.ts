import { useCallback, useState } from "react";
import type { PurchaseSortField, SortOrder } from "./PurchasesList.types";

export const usePurchasesTableState = () => {
  type NavigableItem = { id?: string | number };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPurchaseId, setModalPurchaseId] = useState<string | undefined>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalPurchaseId(undefined);
  }, []);

  const handleOpenModal = useCallback((id?: string) => {
    setModalPurchaseId(id);
    setIsModalOpen(true);
  }, []);

  const handleSelectRow = useCallback((rowId: string) => {
    setSelectedRowId(rowId);
  }, []);

  const handleNavigateItem = useCallback(
    (newIndex: number, items: NavigableItem[]) => {
      if (newIndex >= 0 && newIndex < items.length) {
        const newItem = items[newIndex];
        setModalPurchaseId(String(newItem.id));
        setSelectedRowId(String(newItem.id ?? ""));
      }
    },
    [],
  );

  return {
    isModalOpen,
    modalPurchaseId,
    selectedRowId,
    handleCloseModal,
    handleOpenModal,
    handleSelectRow,
    handleNavigateItem,
  };
};

export const usePurchasesSort = (
  initialField: PurchaseSortField = "purchase_date",
  initialOrder: SortOrder = "desc",
) => {
  const [sortBy, setSortBy] = useState<PurchaseSortField>(initialField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder);

  const handleSort = useCallback((columnKey: string) => {
    const validKeys: PurchaseSortField[] = [
      "purchase_date",
      "folio",
      "supplier",
      "total",
      "notes",
    ];
    if (!validKeys.includes(columnKey as PurchaseSortField)) return;

    setSortBy((prev) => {
      const nextSortBy = columnKey as PurchaseSortField;
      if (prev === nextSortBy) {
        setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
        return prev;
      }

      setSortOrder("asc");
      return nextSortBy;
    });
  }, []);

  return { sortBy, sortOrder, handleSort };
};

export const usePurchaseFormatters = () => {
  const formatDate = useCallback((value: string | null | undefined) => {
    if (!value) return "N/A";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "N/A";
    return parsed.toLocaleDateString("es-MX");
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

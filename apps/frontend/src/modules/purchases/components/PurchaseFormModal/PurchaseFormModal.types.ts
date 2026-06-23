import type { PurchaseListItem } from "../../pages/PurchasesList/PurchasesList.types";

export interface PurchaseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: PurchaseListItem[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

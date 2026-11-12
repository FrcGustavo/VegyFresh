export interface PriceListItemRef {
  id: string | number;
}

export interface PriceListFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceListId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: PriceListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

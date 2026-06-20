export interface OrderListItemRef {
  id: string | number;
}

export interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: OrderListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

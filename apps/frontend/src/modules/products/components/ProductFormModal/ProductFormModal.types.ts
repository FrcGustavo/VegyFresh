export interface ProductListItemRef {
  id: string | number;
}

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: ProductListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export interface SupplierListItemRef {
  id: string | number;
}

export interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: SupplierListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

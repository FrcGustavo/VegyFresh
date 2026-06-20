export interface ClientListItemRef {
  id: string | number;
}

export interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: ClientListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

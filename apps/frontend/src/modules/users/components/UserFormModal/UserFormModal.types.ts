export interface UserListItemRef {
  id: string | number;
}

export interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: UserListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export interface ModalToolbarProps {
  isDisabled: boolean;
  onEditToggle: () => void;
  onSave: () => void;
  onSaveAndClose: () => void;
  onSaveAndNew: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  canNavigateUp?: boolean;
  canNavigateDown?: boolean;
  isSaving?: boolean;
  isEditing?: boolean;
}

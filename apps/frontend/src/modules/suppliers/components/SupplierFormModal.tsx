import { Box, CircularProgress } from '@mui/material';
import FloatingModal from '../../../components/FloatingModal';
import ModalToolbar from '../../../components/ModalToolbar';
import { useSupplierForm } from '../hooks/useSupplierForm';
import SupplierForm from './SupplierForm';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: any[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplierId,
  initialWidth = 760,
  initialHeight = 640,
  list = [],
  currentIndex = 0,
  onNavigate,
}: SupplierFormModalProps) {
  const isEditing = !!supplierId;

  const handleOnSuccess = (action: 'save' | 'save-and-close' | 'save-and-new') => {
    if (action === 'save-and-close') {
      onClose();
    }
  };

  const formProps = useSupplierForm(supplierId, handleOnSuccess);

  const canNavigateUp = isEditing && currentIndex > 0;
  const canNavigateDown = isEditing && currentIndex < list.length - 1;

  const handleNavigateUp = () => {
    if (canNavigateUp && onNavigate) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleNavigateDown = () => {
    if (canNavigateDown && onNavigate) {
      onNavigate(currentIndex + 1);
    }
  };

  const toolbar = (
    <ModalToolbar
      isDisabled={formProps.isDisabled}
      onEditToggle={() => formProps.setIsDisabled(!formProps.isDisabled)}
      onSave={() => formProps.handleSubmit('save')}
      onSaveAndClose={() => formProps.handleSubmit('save-and-close')}
      onSaveAndNew={() => formProps.handleSubmit('save-and-new')}
      onNavigateUp={handleNavigateUp}
      onNavigateDown={handleNavigateDown}
      canNavigateUp={canNavigateUp}
      canNavigateDown={canNavigateDown}
      isSaving={formProps.isSaving}
      isEditing={isEditing}
    />
  );

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={onClose}
      title={'Proveedor'}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <SupplierForm
            {...formProps}
            isDisabled={formProps.isDisabled}
          />
        )
      }
    />
  );
}

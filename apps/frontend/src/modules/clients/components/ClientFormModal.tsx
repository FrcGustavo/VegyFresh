import { Box, CircularProgress } from '@mui/material';
import FloatingModal from '../../../components/FloatingModal';
import ModalToolbar from '../../../components/ModalToolbar';
import { useClientForm } from '../hooks/useClientForm';
import ClientForm from './ClientForm';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  title?: string;
  list?: any[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export default function ClientFormModal({
  isOpen,
  onClose,
  clientId,
  title,
  list = [],
  currentIndex = 0,
  onNavigate,
}: ClientFormModalProps) {
  const isEditing = !!clientId;
  
  const handleOnSuccess = (action: 'save' | 'save-and-close' | 'save-and-new') => {
    if (action === 'save-and-close' || action === 'save-and-new') {
      if (action === 'save-and-new') {
        // Reset for new entry
        onClose();
        setTimeout(() => {
          // Reopen with empty clientId for new form
          // This would require a parent component to handle
        }, 100);
      } else {
        onClose();
      }
    }
  };

  const formProps = useClientForm(clientId, handleOnSuccess);

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
      title={title ?? (clientId ? 'Editar Cliente' : 'Crear Cliente')}
      initialWidth={760}
      initialHeight={640}
      toolbar={isEditing || clientId ? toolbar : undefined}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <ClientForm
            {...formProps}
            title={clientId ? 'Editar Cliente' : 'Crear Cliente'}
            isDisabled={formProps.isDisabled}
          />
        )
      }
    />
  );
}

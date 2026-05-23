import { useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import FloatingModal from '../../../components/FloatingModal';
import ModalTabPanel from '../../../components/ModalTabPanel';
import ModalTabsNavigation from '../../../components/ModalTabsNavigation';
import ModalToolbar from '../../../components/ModalToolbar';
import { useClientForm } from '../hooks/useClientForm';
import ClientForm from './ClientForm';

interface ClientListItemRef {
  id: string | number;
}

interface ClientFormModalProps {
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

export default function ClientFormModal({
  isOpen,
  onClose,
  clientId,
  title,
  initialWidth = 760,
  initialHeight = 640,
  list = [],
  currentIndex = 0,
  onNavigate,
}: ClientFormModalProps) {
  const isEditing = !!clientId;
  const [activeTab, setActiveTab] = useState(0);
  
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

  const tabOptions = [
    { value: 0, label: 'General' },
    { value: 1, label: 'Dirección' },
    { value: 2, label: 'Lista de precios' },
  ];

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (clientId ? 'Editar Cliente' : 'Crear Cliente')}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={isEditing ? toolbar : undefined}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ModalTabsNavigation
              value={activeTab}
              options={tabOptions}
              onChange={setActiveTab}
            />

            <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <ModalTabPanel value={activeTab} index={0}>
                  <ClientForm
                    {...formProps}
                    section="general"
                    isDisabled={formProps.isDisabled}
                  />
              </ModalTabPanel>

              <ModalTabPanel value={activeTab} index={1}>
                  <ClientForm
                    {...formProps}
                    section="address"
                    isDisabled={formProps.isDisabled}
                  />
              </ModalTabPanel>

              <ModalTabPanel value={activeTab} index={2}>
                  <ClientForm
                    {...formProps}
                    section="price-list"
                    isDisabled={formProps.isDisabled}
                  />
              </ModalTabPanel>
            </Box>
          </Box>
        )
      }
    />
  );
}

import { useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../../components/FloatingModal";
import ModalTabPanel from "../../../../components/ModalTabPanel";
import ModalTabsNavigation from "../../../../components/ModalTabsNavigation";
import ModalToolbar from "../../../../components/ModalToolbar";
import { useClientForm } from "../../hooks/useClientForm";
import ClientForm from "../ClientForm";
import { clientFormModalStyles } from "./ClientFormModal.styles";
import type { ClientFormModalProps } from "./ClientFormModal.types";

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
  const [activeTab, setActiveTab] = useState(0);
  const [createdClientId, setCreatedClientId] = useState<string>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const effectiveClientId =
    createdClientId ?? (isCreatingNew ? undefined : clientId);
  const isEditing = !!effectiveClientId;

  const handleClose = () => {
    setCreatedClientId(undefined);
    setIsCreatingNew(false);
    setActiveTab(0);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    client: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedClientId(undefined);
      setIsCreatingNew(true);
      setActiveTab(0);
    } else if (!clientId || isCreatingNew) {
      setCreatedClientId(client.id);
      setIsCreatingNew(false);
    }
  };

  const formProps = useClientForm(effectiveClientId, handleOnSuccess);

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
      onSave={() => formProps.handleSubmit("save")}
      onSaveAndClose={() => formProps.handleSubmit("save-and-close")}
      onSaveAndNew={() => formProps.handleSubmit("save-and-new")}
      onNavigateUp={handleNavigateUp}
      onNavigateDown={handleNavigateDown}
      canNavigateUp={canNavigateUp}
      canNavigateDown={canNavigateDown}
      isSaving={formProps.isSaving}
      isEditing={isEditing}
    />
  );

  const tabOptions = [
    { value: 0, label: "General" },
    { value: 1, label: "Dirección" },
    { value: 2, label: "Lista de precios" },
  ];

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isCreatingNew
          ? "Crear Cliente"
          : createdClientId
            ? "Editar Cliente"
            : (title ??
              (effectiveClientId ? "Editar Cliente" : "Crear Cliente"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={clientFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={clientFormModalStyles.contentRoot}>
            <ModalTabsNavigation
              value={activeTab}
              options={tabOptions}
              onChange={setActiveTab}
            />

            <Box sx={clientFormModalStyles.tabContent}>
              {formProps.formError && (
                <Alert severity="error">{formProps.formError}</Alert>
              )}
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

import { useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../../components/FloatingModal";
import ModalToolbar from "../../../../components/ModalToolbar";
import { useUserForm } from "../../hooks/useUserForm";
import UserForm from "../UserForm";
import { userFormModalStyles } from "./UserFormModal.styles";
import type { UserFormModalProps } from "./UserFormModal.types";

export default function UserFormModal({
  isOpen,
  onClose,
  userId,
  title,
  initialWidth = 560,
  initialHeight = 380,
  list = [],
  currentIndex = 0,
  onNavigate,
}: UserFormModalProps) {
  const [createdUserId, setCreatedUserId] = useState<string>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const effectiveUserId =
    createdUserId ?? (isCreatingNew ? undefined : userId);
  const isEditing = !!effectiveUserId;

  const handleClose = () => {
    setCreatedUserId(undefined);
    setIsCreatingNew(false);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    user: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedUserId(undefined);
      setIsCreatingNew(true);
    } else if (!userId || isCreatingNew) {
      setCreatedUserId(user.id);
      setIsCreatingNew(false);
    }
  };

  const formProps = useUserForm(effectiveUserId, handleOnSuccess);

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

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        isCreatingNew
          ? "Crear Usuario"
          : createdUserId
            ? "Editar Usuario"
            : (title ??
              (effectiveUserId ? "Editar Usuario" : "Crear Usuario"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={userFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {formProps.formError && (
              <Alert severity="error">{formProps.formError}</Alert>
            )}
            <UserForm {...formProps} isDisabled={formProps.isDisabled} />
          </>
        )
      }
    />
  );
}

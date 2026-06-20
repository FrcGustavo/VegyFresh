import { Box, CircularProgress } from "@mui/material";
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
  const isEditing = !!userId;

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
  ) => {
    if (action === "save-and-close") {
      onClose();
    }
  };

  const formProps = useUserForm(userId, handleOnSuccess);

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
      onClose={onClose}
      title={title ?? "Usuario"}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={userFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <UserForm {...formProps} isDisabled={formProps.isDisabled} />
        )
      }
    />
  );
}

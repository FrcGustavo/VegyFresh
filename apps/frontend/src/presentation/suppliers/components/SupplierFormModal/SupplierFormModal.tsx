import { useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../../components/FloatingModal";
import ModalToolbar from "../../../../components/ModalToolbar";
import { useSupplierForm } from "../../hooks/useSupplierForm";
import SupplierForm from "../SupplierForm";
import { supplierFormModalStyles } from "./SupplierFormModal.styles";
import type { SupplierFormModalProps } from "./SupplierFormModal.types";

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplierId,
  title,
  initialWidth = 760,
  initialHeight = 640,
  list = [],
  currentIndex = 0,
  onNavigate,
}: SupplierFormModalProps) {
  const [createdSupplierId, setCreatedSupplierId] = useState<string>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const effectiveSupplierId =
    createdSupplierId ?? (isCreatingNew ? undefined : supplierId);
  const isEditing = !!effectiveSupplierId;

  const handleClose = () => {
    setCreatedSupplierId(undefined);
    setIsCreatingNew(false);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    supplier: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedSupplierId(undefined);
      setIsCreatingNew(true);
    } else if (!supplierId || isCreatingNew) {
      setCreatedSupplierId(supplier.id);
      setIsCreatingNew(false);
    }
  };

  const formProps = useSupplierForm(effectiveSupplierId, handleOnSuccess);

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
          ? "Crear Proveedor"
          : createdSupplierId
            ? "Editar Proveedor"
            : (title ??
              (effectiveSupplierId ? "Editar Proveedor" : "Crear Proveedor"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={supplierFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {formProps.formError && (
              <Alert severity="error">{formProps.formError}</Alert>
            )}
            <SupplierForm {...formProps} isDisabled={formProps.isDisabled} />
          </>
        )
      }
    />
  );
}

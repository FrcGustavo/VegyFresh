import { useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../../components/FloatingModal";
import ModalToolbar from "../../../../components/ModalToolbar";
import { useOrderForm } from "../../hooks/useOrderForm";
import OrderForm from "../OrderForm";
import { orderFormModalStyles } from "./OrderFormModal.styles";
import type { OrderFormModalProps } from "./OrderFormModal.types";

export default function OrderFormModal({
  isOpen,
  onClose,
  orderId,
  title,
  initialWidth = 700,
  initialHeight = 750,
  list = [],
  currentIndex = 0,
  onNavigate,
}: OrderFormModalProps) {
  const [createdOrderId, setCreatedOrderId] = useState<string>();
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const effectiveOrderId =
    createdOrderId ?? (isCreatingNew ? undefined : orderId);
  const isEditing = !!effectiveOrderId;

  const handleClose = () => {
    setCreatedOrderId(undefined);
    setIsCreatingNew(false);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    order: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedOrderId(undefined);
      setIsCreatingNew(true);
    } else if (!orderId || isCreatingNew) {
      setCreatedOrderId(order.id);
      setIsCreatingNew(false);
    }
  };

  const formProps = useOrderForm(effectiveOrderId, handleOnSuccess);

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
          ? "Crear Pedido"
          : createdOrderId
            ? "Editar Pedido"
            : (title ??
              (effectiveOrderId ? "Editar Pedido" : "Crear Pedido"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={orderFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {formProps.formError && (
              <Alert severity="error">{formProps.formError}</Alert>
            )}
            <OrderForm {...formProps} isDisabled={formProps.isDisabled} />
          </>
        )
      }
    />
  );
}

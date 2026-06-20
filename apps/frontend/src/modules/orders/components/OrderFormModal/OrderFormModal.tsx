import { Box, CircularProgress } from "@mui/material";
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
  initialWidth = 700,
  initialHeight = 750,
  list = [],
  currentIndex = 0,
  onNavigate,
}: OrderFormModalProps) {
  const isEditing = !!orderId;

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
  ) => {
    if (action === "save-and-close") {
      onClose();
    }
  };

  const formProps = useOrderForm(orderId, handleOnSuccess);

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
      title="Pedido"
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={orderFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <OrderForm {...formProps} isDisabled={formProps.isDisabled} />
        )
      }
    />
  );
}

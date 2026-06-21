import { useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../../components/FloatingModal";
import ModalToolbar from "../../../../components/ModalToolbar";
import { usePriceListForm } from "../../hooks/usePriceListForm";
import PriceListForm from "../PriceListForm";
import { priceListFormModalStyles } from "./PriceListFormModal.styles";
import type { PriceListFormModalProps } from "./PriceListFormModal.types";

export default function PriceListFormModal({
  isOpen,
  onClose,
  priceListId,
  title,
  initialWidth = 900,
  initialHeight = 740,
  list = [],
  currentIndex = 0,
  onNavigate,
}: PriceListFormModalProps) {
  const [createdPriceListId, setCreatedPriceListId] = useState<string>();
  const effectivePriceListId = priceListId ?? createdPriceListId;
  const isEditing = !!effectivePriceListId;

  const handleClose = () => {
    setCreatedPriceListId(undefined);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    priceList: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedPriceListId(undefined);
    } else if (!priceListId) {
      setCreatedPriceListId(priceList.id);
    }
  };

  const formProps = usePriceListForm(effectivePriceListId, handleOnSuccess);

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
        createdPriceListId
          ? "Editar Lista de Precios"
          : (title ??
            (effectivePriceListId
              ? "Editar Lista de Precios"
              : "Crear Lista de Precios"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={priceListFormModalStyles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {formProps.formError && (
              <Alert severity="error">{formProps.formError}</Alert>
            )}
            <PriceListForm {...formProps} isDisabled={formProps.isDisabled} />
          </>
        )
      }
    />
  );
}

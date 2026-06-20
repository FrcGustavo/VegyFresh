import { Box, CircularProgress } from "@mui/material";
import FloatingModal from "../../../components/FloatingModal";
import ModalToolbar from "../../../components/ModalToolbar";
import { usePriceListForm } from "../hooks/usePriceListForm";
import PriceListForm from "./PriceListForm";

interface PriceListItemRef {
  id: string | number;
}

interface PriceListFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceListId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: PriceListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export default function PriceListFormModal({
  isOpen,
  onClose,
  priceListId,
  initialWidth = 900,
  initialHeight = 740,
  list = [],
  currentIndex = 0,
  onNavigate,
}: PriceListFormModalProps) {
  const isEditing = !!priceListId;

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
  ) => {
    if (action === "save-and-close") {
      onClose();
    }
  };

  const formProps = usePriceListForm(priceListId, handleOnSuccess);

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
      title="Lista de Precios"
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() =>
        formProps.isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <PriceListForm {...formProps} isDisabled={formProps.isDisabled} />
        )
      }
    />
  );
}

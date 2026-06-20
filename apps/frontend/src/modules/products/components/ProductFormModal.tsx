import { useState } from "react";
import {
  Alert,
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  IconButton,
  Paper,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import FloatingModal from "../../../components/FloatingModal";
import ModalTabPanel from "../../../components/ModalTabPanel";
import ModalTabsNavigation from "../../../components/ModalTabsNavigation";
import ModalToolbar from "../../../components/ModalToolbar";
import { useProductForm } from "../hooks/useProductForm";

interface ProductListItemRef {
  id: string | number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: ProductListItemRef[];
  currentIndex?: number;
  onNavigate?: (newIndex: number) => void;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  productId,
  title,
  initialWidth = 800,
  initialHeight = 750,
  list = [],
  currentIndex = 0,
  onNavigate,
}: ProductFormModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [createdProductId, setCreatedProductId] = useState<string>();
  const effectiveProductId = productId ?? createdProductId;
  const isEditing = !!effectiveProductId;

  const handleClose = () => {
    setCreatedProductId(undefined);
    setActiveTab(0);
    onClose();
  };

  const handleOnSuccess = (
    action: "save" | "save-and-close" | "save-and-new",
    product: { id: string },
  ) => {
    if (action === "save-and-close") {
      handleClose();
    } else if (action === "save-and-new") {
      setCreatedProductId(undefined);
      setActiveTab(0);
    } else if (!productId) {
      setCreatedProductId(product.id);
    }
  };

  const formProps = useProductForm(effectiveProductId, handleOnSuccess);

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
    { value: 1, label: "Listas de precios" },
  ];

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        createdProductId
          ? "Editar producto"
          : (title ??
            (effectiveProductId ? "Editar producto" : "Crear nuevo producto"))
      }
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={toolbar}
      renderContent={() => (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Tabs Menu */}
          <ModalTabsNavigation
            value={activeTab}
            options={tabOptions}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {formProps.formError && (
              <Alert severity="error" sx={{ m: 2, mb: 0 }}>
                {formProps.formError}
              </Alert>
            )}

            {/* General Tab */}
            <ModalTabPanel value={activeTab} index={0}>
              <Paper sx={{ p: 3 }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    formProps.handleSubmit("save");
                  }}
                >
                  <TextField
                    fullWidth
                    label="Nombre"
                    name="name"
                    margin="normal"
                    value={formProps.formData.name || ""}
                    onChange={formProps.handleChange}
                    required
                    disabled={formProps.isDisabled}
                  />
                  <TextField
                    fullWidth
                    label="Descripción"
                    name="description"
                    margin="normal"
                    value={formProps.formData.description || ""}
                    onChange={formProps.handleChange}
                    disabled={formProps.isDisabled}
                  />
                  <TextField
                    fullWidth
                    label="Stock"
                    name="stock"
                    type="number"
                    margin="normal"
                    value={formProps.formData.stock}
                    onChange={formProps.handleChange}
                    disabled={formProps.isDisabled}
                    slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
                  />
                  <TextField
                    select
                    fullWidth
                    label="Unidad"
                    name="unit"
                    margin="normal"
                    value={formProps.formData.unit}
                    onChange={formProps.handleChange}
                    disabled={formProps.isDisabled}
                  >
                    <MenuItem value="pz">Pieza</MenuItem>
                    <MenuItem value="kg">Kilogramo</MenuItem>
                  </TextField>
                  <TextField
                    select
                    fullWidth
                    label="Proveedor"
                    name="supplier_id"
                    margin="normal"
                    value={formProps.formData.supplier_id || ""}
                    onChange={formProps.handleChange}
                    required
                    disabled={formProps.isDisabled}
                  >
                    {formProps.suppliers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box sx={{ mt: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6">Imágenes</Typography>
                      {!formProps.isDisabled && (
                        <Button
                          startIcon={<AddIcon />}
                          onClick={formProps.addImageField}
                          size="small"
                        >
                          Agregar imagen
                        </Button>
                      )}
                    </Box>
                    {formProps.formData.images.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No hay imágenes agregadas.
                      </Typography>
                    ) : (
                      formProps.formData.images.map((image, index) => (
                        <Box
                          key={index}
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <TextField
                            fullWidth
                            label={`URL de imagen ${index + 1}`}
                            value={image}
                            onChange={(event) =>
                              formProps.updateImageField(
                                index,
                                event.target.value,
                              )
                            }
                            margin="normal"
                            disabled={formProps.isDisabled}
                          />
                          {!formProps.isDisabled && (
                            <IconButton
                              aria-label={`Eliminar imagen ${index + 1}`}
                              color="error"
                              onClick={() => formProps.removeImageField(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      ))
                    )}
                  </Box>
                </form>
              </Paper>
            </ModalTabPanel>

            {/* Prices List Tab */}
            <ModalTabPanel value={activeTab} index={1}>
              <Paper sx={{ p: 3 }}>
                <Box>
                  <Box
                    sx={{
                      mb: 3,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="h6">Precios asignados</Typography>
                    {!formProps.isDisabled && (
                      <Button
                        startIcon={<AddIcon />}
                        onClick={formProps.addPriceField}
                        variant="contained"
                        size="small"
                      >
                        Asignar precio
                      </Button>
                    )}
                  </Box>

                  {formProps.prices.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Este producto no tiene precios asignados.
                    </Typography>
                  ) : (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 3 }}
                    >
                      {formProps.prices.map((p, index) => (
                        <Paper
                          key={p.id ?? p.clientRowId}
                          variant="outlined"
                          sx={{ p: 2 }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              gap: 2,
                              alignItems: "flex-start",
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <TextField
                                select
                                fullWidth
                                label="Lista de precios"
                                value={p.price_list_id}
                                onChange={(e) =>
                                  formProps.updatePriceField(
                                    index,
                                    "price_list_id",
                                    e.target.value,
                                  )
                                }
                                margin="normal"
                                required
                                disabled={formProps.isDisabled}
                              >
                                {formProps.priceLists.map((list) => (
                                  <MenuItem key={list.id} value={list.id}>
                                    {list.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            </Box>
                            <Box sx={{ flex: 0.5 }}>
                              <TextField
                                type="number"
                                fullWidth
                                label="Precio ($)"
                                value={p.price}
                                onChange={(e) =>
                                  formProps.updatePriceField(
                                    index,
                                    "price",
                                    e.target.value,
                                  )
                                }
                                margin="normal"
                                required
                                disabled={formProps.isDisabled}
                                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                              />
                            </Box>
                            {!formProps.isDisabled && (
                              <IconButton
                                color="error"
                                onClick={() =>
                                  formProps.removePriceField(index)
                                }
                                sx={{ mt: 1 }}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>
              </Paper>
            </ModalTabPanel>
          </Box>
        </Box>
      )}
    />
  );
}

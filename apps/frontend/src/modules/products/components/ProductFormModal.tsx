import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Box, TextField, MenuItem, Button, Typography, IconButton, Paper } from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import FloatingModal from '../../../components/FloatingModal';
import ModalTabPanel from '../../../components/ModalTabPanel';
import ModalTabsNavigation from '../../../components/ModalTabsNavigation';
import ModalToolbar from '../../../components/ModalToolbar';
import { useProductForm } from '../hooks/useProductForm';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  title?: string;
  initialWidth?: number;
  initialHeight?: number;
  list?: any[];
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const isEditing = !!productId;

  const handleOnSuccess = (action: 'save' | 'save-and-close' | 'save-and-new') => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    if (action === 'save-and-close') {
      onClose();
    }
  };

  const formProps = useProductForm(productId, handleOnSuccess);

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
    { value: 1, label: 'Prices List' },
  ];

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (productId ? 'Editar Producto' : 'Crear Nuevo Producto')}
      initialWidth={initialWidth}
      initialHeight={initialHeight}
      toolbar={isEditing ? toolbar : undefined}
      renderContent={() => (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Tabs Menu */}
          <ModalTabsNavigation
            value={activeTab}
            options={tabOptions}
            onChange={setActiveTab}
          />

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* General Tab */}
            <ModalTabPanel value={activeTab} index={0}>
              <Paper sx={{ p: 3 }}>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  formProps.handleSubmit('save');
                }}>
                  <TextField 
                    fullWidth 
                    label="SKU" 
                    name="sku" 
                    margin="normal" 
                    value={formProps.formData.sku || ''} 
                    onChange={formProps.handleChange} 
                    required
                    disabled={formProps.isDisabled}
                  />
                  <TextField 
                    fullWidth 
                    label="Nombre" 
                    name="name" 
                    margin="normal" 
                    value={formProps.formData.name || ''} 
                    onChange={formProps.handleChange} 
                    required
                    disabled={formProps.isDisabled}
                  />
                  <TextField 
                    fullWidth 
                    label="Descripción" 
                    name="description" 
                    margin="normal" 
                    value={formProps.formData.description || ''} 
                    onChange={formProps.handleChange}
                    disabled={formProps.isDisabled}
                  />
                  <TextField 
                    fullWidth 
                    label="Stock" 
                    name="stock" 
                    type="number" 
                    margin="normal" 
                    value={formProps.formData.stock || ''} 
                    onChange={formProps.handleChange}
                    disabled={formProps.isDisabled}
                  />
                  <TextField 
                    select 
                    fullWidth 
                    label="Proveedor" 
                    name="supplier_id" 
                    margin="normal" 
                    value={formProps.formData.supplier_id || ''} 
                    onChange={formProps.handleChange} 
                    required
                    disabled={formProps.isDisabled}
                  >
                    {formProps.suppliers.map((s: any) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </TextField>

                </form>
              </Paper>
            </ModalTabPanel>

            {/* Prices List Tab */}
            <ModalTabPanel value={activeTab} index={1}>
              <Paper sx={{ p: 3 }}>
                <Box>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Asignar Precios</Typography>
                    {!formProps.isDisabled && (
                      <Button 
                        startIcon={<AddIcon />} 
                        onClick={formProps.addPriceField}
                        variant="contained"
                        size="small"
                      >
                        Agregar Precio
                      </Button>
                    )}
                  </Box>

                  {formProps.prices.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay precios agregados. Haz clic en "Agregar Precio" para comenzar.
                    </Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {formProps.prices.map((p, index) => (
                        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Box sx={{ flex: 1 }}>
                              <TextField 
                                select 
                                fullWidth
                                label="Lista de Precio" 
                                value={p.price_list_id} 
                                onChange={(e) => formProps.updatePriceField(index, 'price_list_id', e.target.value)}
                                margin="normal"
                                required
                                disabled={formProps.isDisabled}
                              >
                                {formProps.priceLists.map((list: any) => (
                                  <MenuItem key={list.id} value={list.id}>{list.name}</MenuItem>
                                ))}
                              </TextField>
                            </Box>
                            <Box sx={{ flex: 0.5 }}>
                              <TextField 
                                type="number" 
                                fullWidth
                                label="Precio ($)" 
                                value={p.price} 
                                onChange={(e) => formProps.updatePriceField(index, 'price', e.target.value)}
                                margin="normal"
                                required
                                disabled={formProps.isDisabled}
                              />
                            </Box>
                            {!formProps.isDisabled && (
                              <IconButton 
                                color="error" 
                                onClick={() => formProps.removePriceField(index)}
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

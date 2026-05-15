import { useQueryClient } from '@tanstack/react-query';
import FloatingModal from '../../../components/FloatingModal';
import ProductForm from './ProductForm';
import { useProductForm } from '../hooks/useProductForm';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductFormModal({ isOpen, onClose }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  
  const formProps = useProductForm(undefined, () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    onClose();
  });

  return (
    <FloatingModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Nuevo Producto"
      initialWidth={700}
      initialHeight={600}
    >
      <ProductForm {...formProps} title="Crear Producto" onCancel={onClose} />
    </FloatingModal>
  );
}

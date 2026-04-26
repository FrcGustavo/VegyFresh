import { useParams } from 'react-router';
import { useProductForm } from '../hooks/useProductForm';
import ProductForm from '../components/ProductForm';
import { CircularProgress, Box } from '@mui/material';

export default function ProductsEdit() {
  const { id } = useParams();
  const formProps = useProductForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <ProductForm {...formProps} title="Editar Producto" />;
}

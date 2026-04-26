import { useProductForm } from '../hooks/useProductForm';
import ProductForm from '../components/ProductForm';

export default function ProductsCreate() {
  const formProps = useProductForm();
  return <ProductForm {...formProps} title="Crear Producto" />;
}

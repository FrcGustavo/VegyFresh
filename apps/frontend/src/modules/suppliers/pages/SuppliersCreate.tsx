import { useSupplierForm } from '../hooks/useSupplierForm';
import SupplierForm from '../components/SupplierForm';

export default function SuppliersCreate() {
  const formProps = useSupplierForm();
  return <SupplierForm {...formProps} title="Crear Proveedor" />;
}

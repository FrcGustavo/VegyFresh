import { useParams } from 'react-router';
import { useSupplierForm } from '../hooks/useSupplierForm';
import SupplierForm from '../components/SupplierForm';
import { CircularProgress, Box } from '@mui/material';

export default function SuppliersEdit() {
  const { id } = useParams();
  const formProps = useSupplierForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <SupplierForm {...formProps} title="Editar Proveedor" />;
}

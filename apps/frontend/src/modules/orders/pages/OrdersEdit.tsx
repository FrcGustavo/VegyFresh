import { useParams } from 'react-router';
import { useOrderForm } from '../hooks/useOrderForm';
import OrderForm from '../components/OrderForm';
import { CircularProgress, Box } from '@mui/material';

export default function OrdersEdit() {
  const { id } = useParams();
  const formProps = useOrderForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <OrderForm {...formProps} title="Editar Pedido" />;
}

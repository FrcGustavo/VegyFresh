import { useOrderForm } from '../hooks/useOrderForm';
import OrderForm from '../components/OrderForm';

export default function OrdersCreate() {
  const formProps = useOrderForm();
  return <OrderForm {...formProps} title="Crear Pedido" />;
}

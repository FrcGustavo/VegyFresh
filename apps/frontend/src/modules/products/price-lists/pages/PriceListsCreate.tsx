import { usePriceListForm } from '../hooks/usePriceListForm';
import PriceListForm from '../components/PriceListForm';

export default function PriceListsCreate() {
  const formProps = usePriceListForm();
  return <PriceListForm {...formProps} title="Crear Lista de Precios" />;
}

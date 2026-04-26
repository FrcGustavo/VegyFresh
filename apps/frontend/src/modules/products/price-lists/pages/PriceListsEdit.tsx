import { useParams } from 'react-router';
import { usePriceListForm } from '../hooks/usePriceListForm';
import PriceListForm from '../components/PriceListForm';
import { CircularProgress, Box } from '@mui/material';

export default function PriceListsEdit() {
  const { id } = useParams();
  const formProps = usePriceListForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <PriceListForm {...formProps} title="Editar Lista de Precios" />;
}

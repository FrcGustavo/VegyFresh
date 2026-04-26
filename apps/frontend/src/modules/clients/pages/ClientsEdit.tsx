import { useParams } from 'react-router';
import { useClientForm } from '../hooks/useClientForm';
import ClientForm from '../components/ClientForm';
import { CircularProgress, Box } from '@mui/material';

export default function ClientsEdit() {
  const { id } = useParams();
  const formProps = useClientForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <ClientForm {...formProps} title="Editar Cliente" />;
}

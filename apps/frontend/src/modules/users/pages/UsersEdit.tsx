import { useParams } from 'react-router';
import { useUserForm } from '../hooks/useUserForm';
import UserForm from '../components/UserForm';
import { CircularProgress, Box } from '@mui/material';

export default function UsersEdit() {
  const { id } = useParams();
  const formProps = useUserForm(id);

  if (formProps.isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return <UserForm {...formProps} title="Editar Usuario" />;
}

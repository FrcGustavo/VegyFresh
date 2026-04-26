import { useUserForm } from '../hooks/useUserForm';
import UserForm from '../components/UserForm';

export default function UsersCreate() {
  const formProps = useUserForm();
  return <UserForm {...formProps} title="Crear Usuario" />;
}

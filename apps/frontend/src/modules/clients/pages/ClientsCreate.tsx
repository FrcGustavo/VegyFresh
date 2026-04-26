import { useClientForm } from '../hooks/useClientForm';
import ClientForm from '../components/ClientForm';

export default function ClientsCreate() {
  const formProps = useClientForm();
  return <ClientForm {...formProps} title="Crear Cliente" />;
}

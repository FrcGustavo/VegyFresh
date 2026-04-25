import { RiLockPasswordLine, RiUser3Fill } from 'react-icons/ri';

import CardTransparent from '@/atoms/CardTransparent';
import InputText from '@/atoms/InputText';

const LoginInputs = () => (
  <CardTransparent>
    <InputText 
      type="text"
      name="email"
      placeholder="Correo electronico"
      label={<RiUser3Fill />}
    />
    <InputText 
      type="password"
      name="password"
      placeholder="Contraseña"
      label={<RiLockPasswordLine />}
    />
  </CardTransparent>
);

export default LoginInputs;
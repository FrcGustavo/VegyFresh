import { FC } from 'react';

import { CSSInputText, CSSLabel, CSSInput } from './styles';

type props = {
  type: string,
  name: string,
  placeholder: string,
  label: any
};

const InputText: FC<props> = ({ type, name, placeholder, label }) => (
  <CSSInputText>
    <CSSLabel htmlFor={name}>{label}</CSSLabel>
    <CSSInput type={type} placeholder={placeholder} name={name} id={name} />
  </CSSInputText>
);

export default InputText;

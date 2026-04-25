import { FC } from 'react';

import { CSSCard } from './styles';

type props = {
  children: any,
};

const CardTransparent: FC<props> = ({ children }) => (
  <CSSCard>
    {children}
  </CSSCard>
);

export default CardTransparent;
import { FC } from 'react';
import Link  from 'next/link';

import { CSSNavItem } from './styles';

type props = {
  children: any,
  to: string,
};

const NavItem: FC<props> = ({ children, to }) => (
  <Link href={to}>
    <CSSNavItem>
      {children}
    </CSSNavItem>
  </Link> 
);

export default NavItem;

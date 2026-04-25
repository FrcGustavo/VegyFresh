import { RiBarChart2Line, RiHome7Line } from 'react-icons/ri';

import Avatar from '@/atoms/Avatar';
import NavItem from '@/atoms/NavItem';

import { CSSNav } from './styles';

const Nav = () => (
  <CSSNav>
    <Avatar />
    <NavItem to="/">
      <RiHome7Line />
    </NavItem>
    <NavItem to="/all">
      <RiBarChart2Line />
    </NavItem>
  </CSSNav>
);

export default Nav;
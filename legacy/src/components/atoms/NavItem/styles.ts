import styled from 'styled-components';

export const CSSNavItem = styled.a`
display: flex;
justify-content: center;
align-items: center;
width: 35px;
height: 35px;
border-radius: 50%;
transition: background-color 0.2s ease;
cursor: pointer;

&:hover {
  background-color: #23AA8F;
}

svg {
  font-size: 21px;
  color: #FFF;
}
`;
import TemplateLogin from '@/templates/TemplateLogin';

import styled from 'styled-components';

const CSSContainer = styled.div`
display: flex;
justify-content: center;
align-items: center;
width: 100%;
height: 100%;
background-color: #2A4858;
`;

const Login = () => (
  <CSSContainer>
    <TemplateLogin />
  </CSSContainer>
);

export default Login;
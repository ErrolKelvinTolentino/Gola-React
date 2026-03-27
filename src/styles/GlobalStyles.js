import { createGlobalStyle } from 'styled-components';
import { golaGlobalCss } from './runtimeStyles';

const GlobalStyles = createGlobalStyle`
  ${golaGlobalCss}
`;

export default GlobalStyles;

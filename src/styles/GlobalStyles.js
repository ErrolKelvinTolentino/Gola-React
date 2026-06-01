import { createGlobalStyle } from 'styled-components';
import { golaGlobalCss } from './runtimeStyles';

const GlobalStyles = createGlobalStyle`
  ${golaGlobalCss}

  /* Switch Toggle Styling Overrides */
  .toggle {
    min-height: 28px !important;
    min-width: 52px !important;
    height: 28px !important;
    width: 52px !important;
    padding: 0 !important;
  }
  .toggle span {
    top: 3px !important;
    left: 3px !important;
  }
  .toggle.on span {
    transform: translateX(24px) !important;
  }
`;

export default GlobalStyles;

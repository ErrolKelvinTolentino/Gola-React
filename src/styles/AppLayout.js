import styled from 'styled-components';

export const AppShell = styled.div.attrs(({ $themeMode }) => ({
  className: `app-shell theme-${$themeMode}`
}))``;

export const AuroraLayer = styled.div.attrs(({ $variant }) => ({
  className: `aurora ${$variant}`
}))``;

export const MainPanel = styled.main.attrs(({ $focusMode }) => ({
  className: `main-panel${$focusMode ? ' focus-mode' : ''}`
}))``;

export const FocusWrap = styled.div.attrs({ className: 'focus-wrap' })``;

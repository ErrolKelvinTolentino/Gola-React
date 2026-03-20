import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Gola brand and navigation', () => {
  render(<App />);
  expect(screen.getByText(/welcome to gola web/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tasks/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /goals/i })).toBeInTheDocument();
});

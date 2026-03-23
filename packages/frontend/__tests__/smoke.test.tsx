import { render, screen } from '@testing-library/react';

describe('smoke', () => {
  it('renders a simple element', () => {
    render(<div data-testid="x">CohortLens</div>);
    expect(screen.getByTestId('x')).toHaveTextContent('CohortLens');
  });
});

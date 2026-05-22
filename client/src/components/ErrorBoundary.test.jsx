import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary.jsx';

// Suppress console.error from ErrorBoundary during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function ProblemChild({ shouldThrow = true }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child rendered OK</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Test error')).toBeTruthy();
  });

  it('shows Try Again button that resets error state', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    const tryAgainBtn = screen.getByText('Try Again');
    expect(tryAgainBtn).toBeTruthy();

    // After clicking Try Again, the boundary resets — but the child will throw again
    fireEvent.click(tryAgainBtn);

    // It tries to re-render children; since ProblemChild still throws, error comes back
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('shows fallback message when error has no message', () => {
    function NoMsgError() {
      throw { message: '' }; // error with empty message
    }

    render(
      <ErrorBoundary>
        <NoMsgError />
      </ErrorBoundary>
    );
    expect(screen.getByText('An unexpected error occurred')).toBeTruthy();
  });
});

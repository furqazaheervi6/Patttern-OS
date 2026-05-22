import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast.jsx';

function TestConsumer() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Success!')}>Show Success</button>
      <button onClick={() => toast.error('Error!')}>Show Error</button>
      <button onClick={() => toast.info('Info!')}>Show Info</button>
      <button onClick={() => toast.warning('Warning!')}>Show Warning</button>
    </div>
  );
}

describe('ToastProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Hello</div>
      </ToastProvider>
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('shows a success toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeTruthy();
  });

  it('shows an error toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error!')).toBeTruthy();
  });

  it('shows an info toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Info!')).toBeTruthy();
  });

  it('shows a warning toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning!')).toBeTruthy();
  });

  it('auto-removes toast after timeout', async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success!')).toBeTruthy();

    // Success toast has 3000ms duration
    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(screen.queryByText('Success!')).toBeNull();

    vi.useRealTimers();
  });

  it('removes toast when clicked', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    const toast = screen.getByText('Info!');
    expect(toast).toBeTruthy();

    // Click the toast container to dismiss
    fireEvent.click(toast.closest('[class*="pointer-events-auto"]'));
    expect(screen.queryByText('Info!')).toBeNull();
  });

  it('can show multiple toasts simultaneously', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByText('Success!')).toBeTruthy();
    expect(screen.getByText('Error!')).toBeTruthy();
    expect(screen.getByText('Info!')).toBeTruthy();
  });
});

describe('useToast', () => {
  it('throws when used outside ToastProvider', () => {
    function Bad() {
      useToast();
      return null;
    }

    // Suppress console.error for expected error
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Bad />)).toThrow('useToast must be used within ToastProvider');
  });
});

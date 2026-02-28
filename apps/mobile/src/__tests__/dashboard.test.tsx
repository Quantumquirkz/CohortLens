import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// --- Mocks ---
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children }: any) => children,
}));

const mockHealth = jest.fn();
const mockUsage = jest.fn();
jest.mock('../lib/api', () => ({
  apiClient: {
    health: () => mockHealth(),
    usage: () => mockUsage(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(),
  };
});

import { useQuery } from '@tanstack/react-query';
import DashboardPage from '../../app/dashboard';

const mockUseQuery = useQuery as jest.Mock;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, error: null, data: undefined });
    const { getByText } = render(<DashboardPage />);
    expect(getByText('Dashboard')).toBeTruthy();
    expect(getByText('Analytics Platform')).toBeTruthy();
  });

  it('shows API version and service when health data is available', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: { status: 'ok', service: 'cohortlens', version: '2.0.0', neon_db: 'connected' },
      })
      .mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: { tenant_id: 'tenant-1', current_month_calls: 5 },
      });

    const { getByText } = render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText('2.0.0')).toBeTruthy();
      expect(getByText('cohortlens')).toBeTruthy();
    });
  });

  it('shows error card when health check fails', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        isLoading: false,
        error: new Error('Service unavailable'),
        data: undefined,
      })
      .mockReturnValueOnce({ isLoading: false, error: null, data: undefined });

    const { getByText } = render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(/Health check failed/)).toBeTruthy();
    });
  });

  it('shows error card when usage check fails', async () => {
    mockUseQuery
      .mockReturnValueOnce({ isLoading: false, error: null, data: undefined })
      .mockReturnValueOnce({
        isLoading: false,
        error: new Error('Unauthorized'),
        data: undefined,
      });

    const { getByText } = render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText(/Usage failed/)).toBeTruthy();
    });
  });

  it('shows usage call count when data is available', async () => {
    mockUseQuery
      .mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: { status: 'ok', service: 'cohortlens', version: '2.0.0', neon_db: 'connected' },
      })
      .mockReturnValueOnce({
        isLoading: false,
        error: null,
        data: { tenant_id: 'tenant-1', current_month_calls: 42 },
      });

    const { getByText } = render(<DashboardPage />);

    await waitFor(() => {
      expect(getByText('42')).toBeTruthy();
    });
  });
});

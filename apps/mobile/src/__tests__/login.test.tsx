import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Mocks ---
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockToken = jest.fn();
jest.mock('../lib/api', () => ({
  apiClient: {
    token: (...args: any[]) => mockToken(...args),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Import after mocks
import LoginPage from '../../app/login';

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders username and password inputs', () => {
    const { getByPlaceholderText } = render(<LoginPage />);
    expect(getByPlaceholderText('Enter username')).toBeTruthy();
    expect(getByPlaceholderText('Enter password')).toBeTruthy();
  });

  it('renders the Login button', () => {
    const { getByText } = render(<LoginPage />);
    expect(getByText('Login')).toBeTruthy();
  });

  it('shows validation error when fields are empty', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginPage />);
    fireEvent.changeText(getByPlaceholderText('Enter username'), '');
    fireEvent.changeText(getByPlaceholderText('Enter password'), '');
    fireEvent.press(getByText('Login'));
    await waitFor(() => {
      expect(getByText('Please enter both username and password')).toBeTruthy();
    });
  });

  it('calls apiClient.token with credentials on submit', async () => {
    mockToken.mockResolvedValueOnce({ access_token: 'test-jwt-token' });
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'admin');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockToken).toHaveBeenCalledWith('admin', 'admin');
    });
  });

  it('persists token in AsyncStorage after successful login', async () => {
    mockToken.mockResolvedValueOnce({ access_token: 'test-jwt-token' });
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'admin');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'cohortlens_token',
        'test-jwt-token',
      );
    });
  });

  it('navigates to /dashboard after successful login', async () => {
    mockToken.mockResolvedValueOnce({ access_token: 'test-jwt-token' });
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'admin');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on failed login (401)', async () => {
    mockToken.mockRejectedValueOnce(new Error('Unauthorized'));
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Unauthorized')).toBeTruthy();
    });
  });

  it('shows error message on network failure', async () => {
    mockToken.mockRejectedValueOnce(new Error('Network request failed'));
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'admin');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Network request failed')).toBeTruthy();
    });
  });

  it('shows generic error message when error is not an Error instance', async () => {
    mockToken.mockRejectedValueOnce('unexpected string error');
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'admin');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Login failed')).toBeTruthy();
    });
  });

  it('does not navigate to dashboard when login fails', async () => {
    mockToken.mockRejectedValueOnce(new Error('Unauthorized'));
    const { getByText, getByPlaceholderText } = render(<LoginPage />);

    fireEvent.changeText(getByPlaceholderText('Enter username'), 'admin');
    fireEvent.changeText(getByPlaceholderText('Enter password'), 'bad');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});

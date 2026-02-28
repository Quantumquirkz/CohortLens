import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- Mocks ---
const mockPredict = jest.fn();
jest.mock('../lib/api', () => ({
  apiClient: {
    predict: (...args: any[]) => mockPredict(...args),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import PredictPage from '../../app/predict';

describe('PredictPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    const { getByText } = render(<PredictPage />);
    expect(getByText('Predict Spending Score')).toBeTruthy();
    expect(getByText(/Estimate customer spending score/)).toBeTruthy();
  });

  it('renders all input fields with default values', () => {
    const { getByDisplayValue } = render(<PredictPage />);
    expect(getByDisplayValue('35')).toBeTruthy();
    expect(getByDisplayValue('75000')).toBeTruthy();
    expect(getByDisplayValue('10')).toBeTruthy();
    expect(getByDisplayValue('3')).toBeTruthy();
    expect(getByDisplayValue('Engineer')).toBeTruthy();
  });

  it('renders the Predict button', () => {
    const { getByText } = render(<PredictPage />);
    expect(getByText('Predict')).toBeTruthy();
  });

  it('shows validation error when required fields are empty', async () => {
    const { getByText, getByPlaceholderText } = render(<PredictPage />);
    fireEvent.changeText(getByPlaceholderText('e.g., 35'), '');
    fireEvent.changeText(getByPlaceholderText('e.g., 75000'), '');
    fireEvent.press(getByText('Predict'));
    await waitFor(() => {
      expect(getByText('Please fill in all required fields')).toBeTruthy();
    });
  });

  it('calls apiClient.predict with correct payload', async () => {
    mockPredict.mockResolvedValueOnce({
      predicted_spending: 72.5,
      confidence: 'high',
      rule_version: 'rules-v1',
    });

    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(mockPredict).toHaveBeenCalledWith({
        age: 35,
        annual_income: 75000,
        work_experience: 10,
        family_size: 3,
        profession: 'Engineer',
      });
    });
  });

  it('displays prediction result after successful call', async () => {
    mockPredict.mockResolvedValueOnce({
      predicted_spending: 72.5,
      confidence: 'high',
      rule_version: 'rules-v1',
    });

    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(getByText('Prediction Result')).toBeTruthy();
      expect(getByText('72.5')).toBeTruthy();
      expect(getByText('HIGH')).toBeTruthy();
      expect(getByText('rules-v1')).toBeTruthy();
    });
  });

  it('shows error card on API failure (401 Unauthorized)', async () => {
    mockPredict.mockRejectedValueOnce(new Error('Unauthorized'));
    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(getByText('Unauthorized')).toBeTruthy();
    });
  });

  it('shows error card on network failure', async () => {
    mockPredict.mockRejectedValueOnce(new Error('Network request failed'));
    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(getByText('Network request failed')).toBeTruthy();
    });
  });

  it('shows error card on 503 Service Unavailable', async () => {
    mockPredict.mockRejectedValueOnce(new Error('Service Unavailable'));
    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(getByText('Service Unavailable')).toBeTruthy();
    });
  });

  it('shows generic error message when error is not an Error instance', async () => {
    mockPredict.mockRejectedValueOnce('unexpected error');
    const { getByText } = render(<PredictPage />);
    fireEvent.press(getByText('Predict'));

    await waitFor(() => {
      expect(getByText('Prediction failed')).toBeTruthy();
    });
  });

  it('does not show result card before submitting', () => {
    const { queryByText } = render(<PredictPage />);
    expect(queryByText('Prediction Result')).toBeNull();
  });
});

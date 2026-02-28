import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- Mocks ---
const mockSegment = jest.fn();
jest.mock('../lib/api', () => ({
  apiClient: {
    segment: (...args: any[]) => mockSegment(...args),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import SegmentPage from '../../app/segment';

describe('SegmentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    const { getByText } = render(<SegmentPage />);
    expect(getByText('Segment Customers')).toBeTruthy();
    expect(getByText(/Classify customers into behavioral segments/)).toBeTruthy();
  });

  it('renders default customer rows', () => {
    const { getByText } = render(<SegmentPage />);
    expect(getByText('Customer 1')).toBeTruthy();
    expect(getByText('Customer 2')).toBeTruthy();
  });

  it('renders the Segment button', () => {
    const { getByText } = render(<SegmentPage />);
    expect(getByText('Segment')).toBeTruthy();
  });

  it('renders the Add Row button', () => {
    const { getByText } = render(<SegmentPage />);
    expect(getByText('Add Row')).toBeTruthy();
  });

  it('calls apiClient.segment with the customer rows on submit', async () => {
    mockSegment.mockResolvedValueOnce({
      clusters: [0, 2],
      rule_version: 'rules-v1',
    });

    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(mockSegment).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ CustomerID: 'C1', Age: 25 }),
          expect.objectContaining({ CustomerID: 'C2', Age: 35 }),
        ]),
      );
    });
  });

  it('displays segmentation results after successful call', async () => {
    mockSegment.mockResolvedValueOnce({
      clusters: [0, 2],
      rule_version: 'rules-v1',
    });

    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(getByText('Segmentation Results')).toBeTruthy();
      expect(getByText('Premium Active')).toBeTruthy();
      expect(getByText('Budget Active')).toBeTruthy();
      expect(getByText(/Rule version: rules-v1/)).toBeTruthy();
    });
  });

  it('shows error card on API failure (401 Unauthorized)', async () => {
    mockSegment.mockRejectedValueOnce(new Error('Unauthorized'));
    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(getByText('Unauthorized')).toBeTruthy();
    });
  });

  it('shows error card on network failure', async () => {
    mockSegment.mockRejectedValueOnce(new Error('Network request failed'));
    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(getByText('Network request failed')).toBeTruthy();
    });
  });

  it('shows error card on 503 Service Unavailable', async () => {
    mockSegment.mockRejectedValueOnce(new Error('Service Unavailable'));
    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(getByText('Service Unavailable')).toBeTruthy();
    });
  });

  it('shows generic error when error is not an Error instance', async () => {
    mockSegment.mockRejectedValueOnce('unexpected error');
    const { getByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Segment'));

    await waitFor(() => {
      expect(getByText('Segmentation failed')).toBeTruthy();
    });
  });

  it('does not show results card before submitting', () => {
    const { queryByText } = render(<SegmentPage />);
    expect(queryByText('Segmentation Results')).toBeNull();
  });

  it('adds a new row when Add Row is pressed', () => {
    const { getByText, getAllByText } = render(<SegmentPage />);
    fireEvent.press(getByText('Add Row'));
    expect(getAllByText(/Customer \d/).length).toBe(3);
  });
});

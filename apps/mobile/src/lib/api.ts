import { CohortLensApiClient } from '@cohortlens/contracts';
import { getToken } from './storage';

export const apiClient = new CohortLensApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8001',
  getToken,
});

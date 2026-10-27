import axios, { AxiosError, AxiosResponse } from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000/api';

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ success: boolean; error: ApiErrorResponse }>) => {
    if (error.response?.data?.error) {
      return Promise.reject(error.response.data.error);
    }
    return Promise.reject({
      code: 'NETWORK_ERROR',
      message: error.message || 'Network communication failed',
    });
  }
);

export async function checkBackendHealth(): Promise<{
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}> {
  const response = await apiClient.get('/health');
  return response.data;
}

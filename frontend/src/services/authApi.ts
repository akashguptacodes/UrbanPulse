import { apiClient } from './apiClient.ts';
import { SafeUser, RegisterCredentials, LoginCredentials } from '../types/auth.ts';

interface AuthResponse {
  success: boolean;
  data: {
    user: SafeUser;
  };
}

interface LogoutResponse {
  success: boolean;
  data: {
    message: string;
  };
}

/**
 * Registers a new citizen account
 */
export async function registerUser(credentials: RegisterCredentials): Promise<SafeUser> {
  const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
  return response.data.data.user;
}

/**
 * Authenticates user and establishes HttpOnly session cookie
 */
export async function loginUser(credentials: LoginCredentials): Promise<SafeUser> {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  return response.data.data.user;
}

/**
 * Retrieves the currently authenticated user's profile
 */
export async function getCurrentUser(): Promise<SafeUser> {
  const response = await apiClient.get<AuthResponse>('/auth/me');
  return response.data.data.user;
}

/**
 * Terminates the authenticated session and clears the cookie
 */
export async function logoutUser(): Promise<void> {
  await apiClient.post<LogoutResponse>('/auth/logout');
}

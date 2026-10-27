export type UserRole = 'CITIZEN' | 'ADMIN';

export interface SafeUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

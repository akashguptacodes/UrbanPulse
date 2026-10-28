
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.tsx';
import { LoginPage } from '../src/pages/LoginPage.tsx';
import { RegisterPage } from '../src/pages/RegisterPage.tsx';
import { ProtectedRoute } from '../src/components/ProtectedRoute.tsx';
import * as authApi from '../src/services/authApi.ts';

vi.mock('../src/services/authApi.ts');

describe('Frontend Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates empty inputs on login form submission', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthenticated'));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/please provide both your email and password/i)).toBeInTheDocument();
    });
    expect(authApi.loginUser).not.toHaveBeenCalled();
  });

  it('submits valid credentials and calls loginUser API', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthenticated'));
    vi.mocked(authApi.loginUser).mockResolvedValue({
      id: '123',
      email: 'citizen@example.com',
      full_name: 'Test Citizen',
      role: 'CITIZEN',
      created_at: new Date().toISOString(),
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/complaints" element={<div>Complaints Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText(/resident@example.com/i), {
      target: { value: 'citizen@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: 'SecretPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledWith({
        email: 'citizen@example.com',
        password: 'SecretPass123!',
      });
    });
  });

  it('validates registration form password complexity', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthenticated'));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByPlaceholderText(/jane citizen/i), {
      target: { value: 'Jane Citizen' },
    });
    fireEvent.change(screen.getByPlaceholderText(/jane@example.com/i), {
      target: { value: 'jane@example.com' },
    });
    // Weak password without numbers/specials
    fireEvent.change(screen.getByPlaceholderText(/min 8 chars/i), {
      target: { value: 'simple' },
    });

    fireEvent.click(screen.getByRole('button', { name: /register/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    });
    expect(authApi.registerUser).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users attempting to access protected route', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Session expired'));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Redirected</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/login page redirected/i)).toBeInTheDocument();
      expect(screen.queryByText(/secret content/i)).not.toBeInTheDocument();
    });
  });
});

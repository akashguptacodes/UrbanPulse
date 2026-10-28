import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.tsx';
import { RootLayout } from './layouts/RootLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { ComplaintListPage } from './pages/ComplaintListPage.tsx';
import { ReportComplaintPage } from './pages/ReportComplaintPage.tsx';
import { ComplaintDetailPage } from './pages/ComplaintDetailPage.tsx';
import { DevStatusPage } from './pages/DevStatusPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { ProtectedRoute } from './components/ProtectedRoute.tsx';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            {/* Public routes */}
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="dev-status" element={<DevStatusPage />} />

            {/* Protected complaint routes */}
            <Route
              path="complaints"
              element={
                <ProtectedRoute>
                  <ComplaintListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="complaints/new"
              element={
                <ProtectedRoute>
                  <ReportComplaintPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="complaints/:id"
              element={
                <ProtectedRoute>
                  <ComplaintDetailPage />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

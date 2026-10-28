import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ComplaintListPage } from '../src/pages/ComplaintListPage.tsx';
import { ComplaintDetailPage } from '../src/pages/ComplaintDetailPage.tsx';
import * as complaintApi from '../src/services/complaintApi.ts';
import { useAuth } from '../src/context/AuthContext.tsx';
import { ComplaintDetail, ComplaintListItem } from '../src/types/complaint.ts';

vi.mock('../src/services/complaintApi.ts');
vi.mock('../src/context/AuthContext.tsx', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockCitizenUser = {
  id: 'citizen-user-1',
  email: 'citizen@example.com',
  full_name: 'Jane Citizen',
  role: 'CITIZEN' as const,
  created_at: new Date().toISOString(),
};

const mockAdminUser = {
  id: 'admin-user-1',
  email: 'admin@city.gov',
  full_name: 'Commissioner Gordon',
  role: 'ADMIN' as const,
  created_at: new Date().toISOString(),
};

const mockComplaints: ComplaintListItem[] = [
  {
    id: 'comp-1-uuid',
    citizen_id: 'citizen-user-1',
    primary_category: 'POTHOLES',
    disaster_type: null,
    title: 'Crater in intersection',
    latitude: 37.7749,
    longitude: -122.4194,
    address_text: '5th & Main St',
    current_status: 'SUBMITTED',
    created_at: '2026-10-25T10:00:00.000Z',
    updated_at: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'comp-2-uuid',
    citizen_id: 'citizen-user-1',
    primary_category: 'DISASTERS',
    disaster_type: 'FLOOD',
    title: 'Culvert overflow on Elm St',
    latitude: 37.7833,
    longitude: -122.4167,
    address_text: '124 Elm St',
    current_status: 'UNDER_REVIEW',
    created_at: '2026-10-26T14:30:00.000Z',
    updated_at: '2026-10-26T15:00:00.000Z',
  },
];

const mockComplaintDetail: ComplaintDetail = {
  id: 'comp-1-uuid',
  citizen_id: 'citizen-user-1',
  citizen_name: 'Jane Citizen',
  primary_category: 'POTHOLES',
  disaster_type: null,
  title: 'Crater in intersection',
  description: 'A deep pothole at 5th and Main damaging wheel rims.',
  latitude: 37.7749,
  longitude: -122.4194,
  address_text: '5th & Main St',
  current_status: 'SUBMITTED',
  created_at: '2026-10-25T10:00:00.000Z',
  updated_at: '2026-10-25T10:00:00.000Z',
  evidence: [],
  status_history: [
    {
      id: 'hist-1',
      previous_status: null,
      new_status: 'SUBMITTED',
      changed_by: 'Jane Citizen (Citizen)',
      reason_or_notes: 'Initial citizen report submission',
      created_at: '2026-10-25T10:00:00.000Z',
    },
  ],
};

describe('Complaint List Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockCitizenUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
  });

  it('renders complaints table with category, status, and metadata', async () => {
    vi.mocked(complaintApi.getComplaints).mockResolvedValue({
      complaints: mockComplaints,
      meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Crater in intersection')).toBeInTheDocument();
      expect(screen.getByText('Culvert overflow on Elm St')).toBeInTheDocument();
      expect(screen.getByText('Pothole')).toBeInTheDocument();
      expect(screen.getByText('FLOOD')).toBeInTheDocument();
      expect(screen.getAllByText('Submitted').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Under Review').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders empty state when no complaints are returned', async () => {
    vi.mocked(complaintApi.getComplaints).mockResolvedValue({
      complaints: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no complaints found/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /report a civic issue/i })).toBeInTheDocument();
    });
  });

  it('renders error state and retries on user click', async () => {
    vi.mocked(complaintApi.getComplaints)
      .mockRejectedValueOnce(new Error('Network error connecting to municipal server'))
      .mockResolvedValueOnce({
        complaints: mockComplaints,
        meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });

    render(
      <MemoryRouter>
        <ComplaintListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/network error connecting to municipal server/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry request/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Crater in intersection')).toBeInTheDocument();
    });
    expect(complaintApi.getComplaints).toHaveBeenCalledTimes(2);
  });

  it('reveals disaster subtype dropdown only when DISASTERS filter is active', async () => {
    vi.mocked(complaintApi.getComplaints).mockResolvedValue({
      complaints: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    render(
      <MemoryRouter initialEntries={['/complaints?category=DISASTERS']}>
        <ComplaintListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/disaster subtype/i)).toBeInTheDocument();
      expect(screen.getByText(/all disaster types/i)).toBeInTheDocument();
    });
  });
});

describe('Complaint Detail Page Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complaint detail and audit history timeline for citizen', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockCitizenUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(complaintApi.getComplaintById).mockResolvedValue(mockComplaintDetail);

    render(
      <MemoryRouter initialEntries={['/complaints/comp-1-uuid']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Crater in intersection')).toBeInTheDocument();
      expect(screen.getByText(/a deep pothole at 5th and main damaging wheel rims/i)).toBeInTheDocument();
      expect(screen.getByText('Jane Citizen')).toBeInTheDocument();
      expect(screen.getByText(/initial citizen report submission/i)).toBeInTheDocument();
    });

    // Citizen should NOT see admin status management console
    expect(screen.queryByText(/administrative status management/i)).not.toBeInTheDocument();
  });

  it('renders not-found state on non-existent or restricted complaint', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockCitizenUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(complaintApi.getComplaintById).mockRejectedValue(new Error('Complaint not found or unauthorized'));

    render(
      <MemoryRouter initialEntries={['/complaints/non-existent-id']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /complaint not found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /return to complaints list/i })).toBeInTheDocument();
    });
  });

  it('displays administrative status management console only for ADMIN', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(complaintApi.getComplaintById).mockResolvedValue(mockComplaintDetail);

    render(
      <MemoryRouter initialEntries={['/complaints/comp-1-uuid']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/administrative status management/i)).toBeInTheDocument();
      expect(screen.getByText(/admin authorized/i)).toBeInTheDocument();
    });

    // From SUBMITTED, allowed next statuses are UNDER_REVIEW and REJECTED
    expect(screen.getByRole('option', { name: /under review \(under_review\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /rejected \(rejected\)/i })).toBeInTheDocument();
  });

  it('enforces mandatory reason note when admin selects REJECTED status', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(complaintApi.getComplaintById).mockResolvedValue(mockComplaintDetail);

    render(
      <MemoryRouter initialEntries={['/complaints/comp-1-uuid']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/administrative status management/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'REJECTED' } });

    // Try submitting without reason
    const form = screen.getByRole('button', { name: /commit status transition/i }).closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/a reason or administrative note is mandatory when rejecting a complaint/i)
      ).toBeInTheDocument();
    });
    expect(complaintApi.updateComplaintStatus).not.toHaveBeenCalled();
  });

  it('successfully updates status when valid transition and reason are submitted by admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(complaintApi.getComplaintById).mockResolvedValue(mockComplaintDetail);
    vi.mocked(complaintApi.updateComplaintStatus).mockResolvedValue({
      ...mockComplaintDetail,
      current_status: 'UNDER_REVIEW',
      status_history: [
        ...mockComplaintDetail.status_history,
        {
          id: 'hist-2',
          previous_status: 'SUBMITTED',
          new_status: 'UNDER_REVIEW',
          changed_by: 'Commissioner Gordon (Admin)',
          reason_or_notes: 'Dispatched inspector unit #4',
          created_at: new Date().toISOString(),
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/complaints/comp-1-uuid']}>
        <Routes>
          <Route path="/complaints/:id" element={<ComplaintDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/administrative status management/i)).toBeInTheDocument();
    });

    const statusSelect = screen.getByRole('combobox');
    fireEvent.change(statusSelect, { target: { value: 'UNDER_REVIEW' } });

    const notesInput = screen.getByPlaceholderText(/optional note or dispatch instructions/i);
    fireEvent.change(notesInput, { target: { value: 'Dispatched inspector unit #4' } });

    const submitBtn = screen.getByRole('button', { name: /commit status transition/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(complaintApi.updateComplaintStatus).toHaveBeenCalledWith('comp-1-uuid', {
        new_status: 'UNDER_REVIEW',
        reason_or_notes: 'Dispatched inspector unit #4',
      });
      expect(screen.getByText(/status successfully updated to 'UNDER_REVIEW'/i)).toBeInTheDocument();
    });
  });
});

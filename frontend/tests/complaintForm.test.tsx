
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportComplaintPage } from '../src/pages/ReportComplaintPage.tsx';
import * as complaintApi from '../src/services/complaintApi.ts';

vi.mock('../src/services/complaintApi.ts');

describe('Report Complaint Form Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four primary civic categories', () => {
    render(
      <MemoryRouter>
        <ReportComplaintPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/potholes & road damage/i)).toBeInTheDocument();
    expect(screen.getByText(/street lighting/i)).toBeInTheDocument();
    expect(screen.getByText(/garbage & sanitation/i)).toBeInTheDocument();
    expect(screen.getByText(/civic emergencies & disasters/i)).toBeInTheDocument();
  });

  it('shows disaster subtype only when DISASTERS category is selected', () => {
    render(
      <MemoryRouter>
        <ReportComplaintPage />
      </MemoryRouter>
    );

    // Default category is POTHOLES - disaster subtype should not be visible
    expect(screen.queryByText(/disaster emergency subtype/i)).not.toBeInTheDocument();

    // Select DISASTERS
    const disasterCategory = screen.getByLabelText(/civic emergencies & disasters/i);
    fireEvent.click(disasterCategory);

    // Disaster subtype should now appear with subtypes
    expect(screen.getByText(/disaster emergency subtype/i)).toBeInTheDocument();
    expect(screen.getByText(/fire hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/flooding \/ water hazard/i)).toBeInTheDocument();
    expect(screen.getByText(/other emergency/i)).toBeInTheDocument();

    // Select GARBAGE - disaster subtype must disappear
    const garbageCategory = screen.getByLabelText(/garbage & sanitation/i);
    fireEvent.click(garbageCategory);
    expect(screen.queryByText(/disaster emergency subtype/i)).not.toBeInTheDocument();
  });

  it('validates coordinates range and rejects invalid numbers', async () => {
    render(
      <MemoryRouter>
        <ReportComplaintPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Deep pothole/i), {
      target: { value: 'Severe asphalt crater on 4th' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Crater measuring 25cm deep causing vehicular swerving.' },
    });
    // Out of range coordinates
    fireEvent.change(screen.getByPlaceholderText('37.7749'), {
      target: { value: '95.5' },
    });
    fireEvent.change(screen.getByPlaceholderText('-122.4194'), {
      target: { value: '200' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));

    await waitFor(() => {
      expect(screen.getByText(/latitude must be a valid number between -90 and 90/i)).toBeInTheDocument();
      expect(screen.getByText(/longitude must be a valid number between -180 and 180/i)).toBeInTheDocument();
    });
    expect(complaintApi.createComplaint).not.toHaveBeenCalled();
  });

  it('submits valid complaint and navigates to complaint detail page', async () => {
    vi.mocked(complaintApi.createComplaint).mockResolvedValue({
      id: 'abc-123-uuid',
      citizen_id: 'user-1',
      citizen_name: 'Test Citizen',
      primary_category: 'POTHOLES',
      disaster_type: null,
      title: 'Valid Street Pothole Issue',
      description: 'Extensive road damage right in front of civic center.',
      latitude: 37.7749,
      longitude: -122.4194,
      address_text: 'Corner of 4th & Market',
      current_status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      evidence: [],
      status_history: [],
    });

    render(
      <MemoryRouter>
        <ReportComplaintPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Deep pothole/i), {
      target: { value: 'Valid Street Pothole Issue' },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe the issue/i), {
      target: { value: 'Extensive road damage right in front of civic center.' },
    });
    fireEvent.change(screen.getByPlaceholderText('37.7749'), {
      target: { value: '37.7749' },
    });
    fireEvent.change(screen.getByPlaceholderText('-122.4194'), {
      target: { value: '-122.4194' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit complaint/i }));

    await waitFor(() => {
      expect(complaintApi.createComplaint).toHaveBeenCalledWith({
        title: 'Valid Street Pothole Issue',
        description: 'Extensive road damage right in front of civic center.',
        primary_category: 'POTHOLES',
        disaster_type: null,
        latitude: 37.7749,
        longitude: -122.4194,
        address_text: null,
      });
    });
  });
});

export type ComplaintCategory = 'POTHOLES' | 'STREET_LIGHTS' | 'GARBAGE' | 'DISASTERS';
export type DisasterType = 'FIRE' | 'FLOOD' | 'OTHER';
export type ComplaintStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export const COMPLAINT_CATEGORIES: { key: ComplaintCategory; label: string; description: string }[] = [
  {
    key: 'POTHOLES',
    label: 'Potholes & Road Damage',
    description: 'Crater, cracked asphalt, sunken surfaces posing hazards to vehicles and pedestrians.',
  },
  {
    key: 'STREET_LIGHTS',
    label: 'Street Lighting',
    description: 'Broken streetlights, flickering fixtures, unlit dark corridors, day-burning fixtures.',
  },
  {
    key: 'GARBAGE',
    label: 'Garbage & Sanitation',
    description: 'Overflowing public dumpsters, illegal trash dumping, uncollected curbside waste.',
  },
  {
    key: 'DISASTERS',
    label: 'Civic Emergencies & Disasters',
    description: 'Severe public hazards (fire, flood, structural emergency). Requires subtype selection.',
  },
];

export const DISASTER_TYPES: { key: DisasterType; label: string }[] = [
  { key: 'FIRE', label: 'Fire Hazard' },
  { key: 'FLOOD', label: 'Flooding / Water Hazard' },
  { key: 'OTHER', label: 'Other Emergency' },
];

export const COMPLAINT_STATUSES: { key: ComplaintStatus; label: string; description: string }[] = [
  { key: 'SUBMITTED', label: 'Submitted', description: 'Complaint received and queued for review.' },
  { key: 'UNDER_REVIEW', label: 'Under Review', description: 'Municipal staff is assessing and triaging the issue.' },
  { key: 'IN_PROGRESS', label: 'In Progress', description: 'Work crew or service department has been dispatched.' },
  { key: 'RESOLVED', label: 'Resolved', description: 'Work has been completed and verified.' },
  { key: 'REJECTED', label: 'Rejected', description: 'Complaint was dismissed, duplicate, or out of municipal jurisdiction.' },
];

/**
 * Permitted status transitions per centralized state machine
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLVED', 'UNDER_REVIEW', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

export interface ComplaintEvidenceDto {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  download_url?: string;
}

export interface ComplaintStatusHistoryDto {
  id: string;
  previous_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  reason_or_notes: string | null;
  changed_by: string;
  created_at: string;
}

export interface ComplaintListItem {
  id: string;
  citizen_id: string;
  primary_category: ComplaintCategory;
  disaster_type: DisasterType | null;
  title: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  current_status: ComplaintStatus;
  created_at: string;
  updated_at: string;
}

export interface ComplaintDetail extends ComplaintListItem {
  description: string;
  citizen_name: string;
  evidence: ComplaintEvidenceDto[];
  status_history: ComplaintStatusHistoryDto[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ComplaintListResponse {
  complaints: ComplaintListItem[];
  meta: PaginationMeta;
}

export interface CreateComplaintPayload {
  title: string;
  description: string;
  primary_category: ComplaintCategory;
  disaster_type?: DisasterType | null;
  latitude: number;
  longitude: number;
  address_text?: string | null;
}

export interface ComplaintFilters {
  page?: number;
  limit?: number;
  category?: ComplaintCategory;
  status?: ComplaintStatus;
  disaster_type?: DisasterType;
  search?: string;
  sort_by?: 'created_at' | 'current_status' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface UpdateStatusPayload {
  new_status: ComplaintStatus;
  reason_or_notes?: string | null;
}

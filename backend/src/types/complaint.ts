import { ComplaintCategory, ComplaintStatus } from '@prisma/client';

export { ComplaintCategory, ComplaintStatus };

export type DisasterType = 'FIRE' | 'FLOOD' | 'OTHER';

export const COMPLAINT_CATEGORIES = ['POTHOLES', 'STREET_LIGHTS', 'GARBAGE', 'DISASTERS'] as const;
export const DISASTER_TYPES = ['FIRE', 'FLOOD', 'OTHER'] as const;
export const COMPLAINT_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'IN_PROGRESS',
  'RESOLVED',
  'REJECTED',
] as const;

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

export interface ComplaintListItemDto {
  id: string;
  citizen_id: string;
  primary_category: ComplaintCategory;
  disaster_type: string | null;
  title: string;
  latitude: number;
  longitude: number;
  address_text: string | null;
  current_status: ComplaintStatus;
  created_at: string;
  updated_at: string;
}

export interface ComplaintDetailDto extends ComplaintListItemDto {
  description: string;
  citizen_name: string;
  evidence: ComplaintEvidenceDto[];
  status_history: ComplaintStatusHistoryDto[];
}

export interface ComplaintPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ComplaintListResult {
  complaints: ComplaintListItemDto[];
  meta: ComplaintPaginationMeta;
  pagination: ComplaintPaginationMeta;
}

export interface CreateComplaintInput {
  title: string;
  description: string;
  primary_category: ComplaintCategory;
  disaster_type?: DisasterType | null;
  latitude: number;
  longitude: number;
  address_text?: string | null;
  evidence?: Array<{
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    storage_key: string;
  }>;
}

export interface ListComplaintsFilters {
  page?: number;
  limit?: number;
  category?: ComplaintCategory;
  status?: ComplaintStatus;
  disaster_type?: DisasterType;
  search?: string;
  sort_by?: 'created_at' | 'current_status' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface UpdateComplaintStatusInput {
  new_status: ComplaintStatus;
  reason_or_notes?: string | null;
}

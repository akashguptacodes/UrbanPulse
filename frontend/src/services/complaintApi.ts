import { apiClient } from './apiClient.ts';
import {
  ComplaintListItem,
  ComplaintDetail,
  PaginationMeta,
  CreateComplaintPayload,
  ComplaintFilters,
  UpdateStatusPayload,
  EvidenceItemPayload,
} from '../types/complaint.ts';

interface SingleComplaintResponse {
  success: boolean;
  data: {
    complaint: ComplaintDetail;
  };
}

interface ListComplaintsResponse {
  success: boolean;
  data: {
    complaints: ComplaintListItem[];
  };
  meta: PaginationMeta;
  pagination?: PaginationMeta;
}

interface UpdateStatusResponse {
  success: boolean;
  data: {
    complaint_id: string;
    previous_status: string;
    current_status: string;
    updated_at: string;
    complaint: ComplaintDetail;
  };
}

/**
 * Creates a new complaint for the currently authenticated user
 */
export async function createComplaint(payload: CreateComplaintPayload): Promise<ComplaintDetail> {
  const response = await apiClient.post<SingleComplaintResponse>('/complaints', payload);
  return response.data.data.complaint;
}

/**
 * Lists complaints with filtering and pagination
 */
export async function getComplaints(filters: ComplaintFilters = {}): Promise<{
  complaints: ComplaintListItem[];
  meta: PaginationMeta;
}> {
  const params: Record<string, string | number> = {};

  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.category) params.category = filters.category;
  if (filters.status) params.status = filters.status;
  if (filters.disaster_type) params.disaster_type = filters.disaster_type;
  if (filters.search && filters.search.trim().length > 0) params.search = filters.search.trim();
  if (filters.sort_by) params.sort_by = filters.sort_by;
  if (filters.sort_order) params.sort_order = filters.sort_order;

  const response = await apiClient.get<ListComplaintsResponse>('/complaints', { params });
  return {
    complaints: response.data.data.complaints || [],
    meta: response.data.meta || response.data.pagination || {
      page: 1,
      limit: 20,
      total: response.data.data.complaints?.length || 0,
      totalPages: 1,
    },
  };
}

/**
 * Retrieves complaint details by ID
 */
export async function getComplaintById(id: string): Promise<ComplaintDetail> {
  const response = await apiClient.get<SingleComplaintResponse>(`/complaints/${id}`);
  return response.data.data.complaint;
}

/**
 * Updates status of a complaint (Admin only)
 */
export async function updateComplaintStatus(
  id: string,
  payload: UpdateStatusPayload
): Promise<ComplaintDetail> {
  const response = await apiClient.patch<UpdateStatusResponse>(`/complaints/${id}/status`, payload);
  return response.data.data.complaint;
}

/**
 * Uploads an evidence image file (JPEG, PNG, WebP) to the storage service
 */
export async function uploadEvidenceImage(file: File): Promise<EvidenceItemPayload> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<{
    success: boolean;
    data: {
      evidence: {
        original_filename: string;
        mime_type: string;
        file_size_bytes: number;
        storage_key: string;
        url: string;
      };
    };
  }>('/complaints/evidence/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data.data.evidence;
}

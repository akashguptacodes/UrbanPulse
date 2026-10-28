import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { getComplaints } from '../services/complaintApi.ts';
import {
  ComplaintListItem,
  ComplaintCategory,
  DisasterType,
  ComplaintStatus,
  PaginationMeta,
  COMPLAINT_CATEGORIES,
  DISASTER_TYPES,
  COMPLAINT_STATUSES,
} from '../types/complaint.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { CategoryBadge } from '../components/CategoryBadge.tsx';
import { Pagination } from '../components/Pagination.tsx';

export const ComplaintListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [complaints, setComplaints] = useState<ComplaintListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // URL / Filter states
  const categoryParam = (searchParams.get('category') as ComplaintCategory) || '';
  const statusParam = (searchParams.get('status') as ComplaintStatus) || '';
  const disasterTypeParam = (searchParams.get('disaster_type') as DisasterType) || '';
  const searchParam = searchParams.get('search') || '';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  const [searchInput, setSearchInput] = useState(searchParam);

  const fetchComplaints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getComplaints({
        page: pageParam,
        limit: 10,
        category: categoryParam || undefined,
        status: statusParam || undefined,
        disaster_type: categoryParam === 'DISASTERS' && disasterTypeParam ? disasterTypeParam : undefined,
        search: searchParam || undefined,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setComplaints(data.complaints);
      setMeta(data.meta);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to load complaints. Please verify network connectivity and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [pageParam, categoryParam, statusParam, disasterTypeParam, searchParam]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    // Reset to page 1 on filter changes
    next.set('page', '1');

    // If changing category away from DISASTERS, clear disaster_type
    if (key === 'category' && value !== 'DISASTERS') {
      next.delete('disaster_type');
    }

    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(newPage));
    setSearchParams(next);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              {isAdmin ? 'Municipal Complaint Triage Console' : 'My Reported Issues'}
            </h1>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {isAdmin ? 'Citywide Admin View' : 'Citizen Scoped'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Review and manage complaints across all municipal districts.'
              : 'Track the status and resolution timeline of reports you submitted.'}
          </p>
        </div>

        <Link
          to="/complaints/new"
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          + Report New Issue
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryParam}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusParam}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Statuses</option>
              {COMPLAINT_STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Disaster Subtype Filter */}
          {categoryParam === 'DISASTERS' ? (
            <div>
              <label className="block text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                Disaster Subtype
              </label>
              <select
                value={disasterTypeParam}
                onChange={(e) => updateFilter('disaster_type', e.target.value)}
                className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs bg-rose-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">All Disaster Types</option>
                {DISASTER_TYPES.map((dt) => (
                  <option key={dt.key} value={dt.key}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Search Title / Description
              </label>
              <form onSubmit={handleSearchSubmit} className="flex gap-1">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Keyword search..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Go
                </button>
              </form>
            </div>
          )}

          {/* Reset / Actions */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold rounded-lg transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-2">
          <div className="font-bold">Failed to load complaints</div>
          <div>{error}</div>
          <button
            onClick={() => fetchComplaints()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
          >
            Retry Request
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading complaints from database...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
          <div className="text-4xl text-slate-400 select-none">📋</div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No complaints found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {categoryParam || statusParam || searchParam
                ? 'No complaints matched your active filter criteria. Try resetting filters.'
                : 'You have not submitted any complaints yet. Report an issue to get started.'}
            </p>
          </div>
          {categoryParam || statusParam || searchParam ? (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
            >
              Clear Active Filters
            </button>
          ) : (
            <Link
              to="/complaints/new"
              className="inline-block px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
            >
              Report a Civic Issue
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title / ID</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((item) => {
                  const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900 max-w-xs">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="hover:text-sky-600 font-semibold line-clamp-1 text-slate-900"
                        >
                          {item.title}
                        </Link>
                        <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                          #{item.id.substring(0, 8)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <CategoryBadge category={item.primary_category} disasterType={item.disaster_type} />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={item.current_status} />
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                        <span className="line-clamp-1">
                          {item.address_text || `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{formattedDate}</td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition-colors"
                        >
                          Details ➔
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4">
            <Pagination meta={meta} onPageChange={handlePageChange} disabled={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

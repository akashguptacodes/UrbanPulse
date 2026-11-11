import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
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
import {
  PlusCircle,
  Search,
  Filter,
  RotateCcw,
  MapPin,
  Calendar,
  Inbox,
  AlertTriangle,
  Copy,
} from 'lucide-react';

export const ComplaintListPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [bannerMessage, setBannerMessage] = useState<string | null>(
    (location.state as any)?.bannerMessage || null
  );

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
      {/* Optional Notification Banner (e.g. after discarding duplicate report) */}
      {bannerMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-base">✅</span>
            <span className="font-medium">{bannerMessage}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold ml-2 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-civic-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-forest-950 tracking-tight">
              {isAdmin ? 'Municipal Complaint Triage Console' : 'My Reported Issues'}
            </h1>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                isAdmin
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              {isAdmin ? 'Citywide Admin View' : 'Citizen Scoped'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-civic-muted mt-1 max-w-xl">
            {isAdmin
              ? 'Review and manage complaints across all municipal districts.'
              : 'Track the status and resolution timeline of reports you submitted.'}
          </p>
        </div>

        <Link
          to="/complaints/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-forest-900 hover:bg-forest-800 text-white text-xs sm:text-sm font-bold rounded-md shadow-sm transition-all duration-150 whitespace-nowrap active:scale-98"
        >
          <PlusCircle className="w-4 h-4 text-lime-400" />
          <span>+ Report New Issue</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-civic-border shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-forest-900">
          <Filter className="w-3.5 h-3.5 text-emerald-700" />
          <span className="uppercase tracking-wider text-[11px]">Filter &amp; Query Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-civic-muted uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryParam}
              onChange={(e) => updateFilter('category', e.target.value)}
              className="w-full px-3 py-1.5 border border-civic-border rounded-md text-xs bg-white text-civic-text focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 transition-all shadow-2xs"
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
            <label className="block text-[11px] font-bold text-civic-muted uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusParam}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full px-3 py-1.5 border border-civic-border rounded-md text-xs bg-white text-civic-text focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 transition-all shadow-2xs"
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
              <label className="block text-[11px] font-bold text-red-700 uppercase tracking-wider mb-1">
                Disaster Subtype
              </label>
              <select
                value={disasterTypeParam}
                onChange={(e) => updateFilter('disaster_type', e.target.value)}
                className="w-full px-3 py-1.5 border border-red-300 rounded-md text-xs bg-red-50/50 text-red-950 focus:outline-hidden focus:ring-1 focus:ring-red-600 focus:border-red-600 transition-all shadow-2xs"
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
              <label className="block text-[11px] font-bold text-civic-muted uppercase tracking-wider mb-1">
                Search Title / Description
              </label>
              <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-civic-muted">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Keyword search..."
                    className="w-full pl-8 pr-2.5 py-1.5 border border-civic-border rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-forest-700 focus:border-forest-700 shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-forest-900 hover:bg-forest-800 text-white text-xs font-semibold rounded-md transition-all shadow-2xs"
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
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-civic-border text-civic-muted hover:text-forest-900 hover:bg-forest-50/50 text-xs font-semibold rounded-md transition-all shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-900 text-xs space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Failed to load complaints</span>
          </div>
          <div className="text-red-700 leading-relaxed font-mono text-[11px]">{error}</div>
          <button
            onClick={() => fetchComplaints()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition-colors shadow-2xs"
          >
            Retry Request
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-lg border border-civic-border p-10 text-center space-y-3 shadow-xs">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-civic-muted font-medium">Loading complaints from database...</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-lg border border-civic-border p-12 text-center space-y-3.5 shadow-xs">
          <div className="w-12 h-12 rounded-lg bg-forest-50 text-forest-800 flex items-center justify-center mx-auto border border-forest-100">
            <Inbox className="w-6 h-6 opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-bold text-forest-950">No complaints found</h3>
            <p className="text-xs text-civic-muted max-w-sm mx-auto leading-relaxed">
              {categoryParam || statusParam || searchParam
                ? 'No complaints matched your active filter criteria. Try resetting filters.'
                : 'You have not submitted any complaints yet. Report an issue to get started.'}
            </p>
          </div>
          {categoryParam || statusParam || searchParam ? (
            <button
              onClick={handleResetFilters}
              className="px-3.5 py-1.5 text-xs font-semibold bg-forest-50 hover:bg-forest-100 text-forest-900 rounded-md transition-colors border border-forest-200"
            >
              Clear Active Filters
            </button>
          ) : (
            <Link
              to="/complaints/new"
              className="inline-block px-4 py-2 text-xs font-bold bg-forest-900 hover:bg-forest-800 text-white rounded-md transition-all shadow-sm active:scale-95"
            >
              Report a Civic Issue
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-civic-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forest-50/50 border-b border-civic-border text-forest-900 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title / ID</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-civic-border/70">
                {complaints.map((item) => {
                  const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-forest-50/30 transition-colors group">
                      <td className="py-3.5 px-4 font-medium text-forest-950 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <Link
                            to={`/complaints/${item.id}`}
                            className="group-hover:text-emerald-700 font-bold line-clamp-1 text-forest-950 transition-colors"
                          >
                            {item.title}
                          </Link>
                          {item.is_duplicate && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                              <Copy className="w-2.5 h-2.5" />
                              DUPLICATE
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-civic-muted block mt-0.5">
                          #{item.id.substring(0, 8)}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <CategoryBadge category={item.primary_category} disasterType={item.disaster_type} />
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <StatusBadge status={item.current_status} />
                      </td>

                      <td className="py-3.5 px-3 text-civic-muted max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-civic-muted/80 shrink-0" />
                          <span className="line-clamp-1 text-xs">
                            {item.address_text ||
                              `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-civic-muted whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-civic-muted/80 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/complaints/${item.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded transition-all"
                        >
                          <span>Details ➔</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2">
            <Pagination meta={meta} onPageChange={handlePageChange} disabled={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
};

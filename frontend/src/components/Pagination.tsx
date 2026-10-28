import React from 'react';
import { PaginationMeta } from '../types/complaint.ts';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (newPage: number) => void;
  disabled?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange, disabled = false }) => {
  const { page, totalPages, total, limit } = meta;

  if (totalPages <= 1 && total === 0) {
    return null;
  }

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t border-slate-200 text-xs text-slate-600">
      <div>
        Showing <span className="font-semibold text-slate-900">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-900">{total}</span> results
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          aria-label="Previous Page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Previous
        </button>

        <span className="px-3 py-1 font-medium text-slate-700">
          Page {page} of {Math.max(totalPages, 1)}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
          aria-label="Next Page"
          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

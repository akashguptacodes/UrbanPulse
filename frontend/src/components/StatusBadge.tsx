import React from 'react';
import { ComplaintStatus } from '../types/complaint.ts';
import { Clock, Search, Wrench, CheckCircle2, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md';
}

interface StatusStyle {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIG: Record<ComplaintStatus, StatusStyle> = {
  SUBMITTED: {
    label: 'Submitted',
    bg: 'bg-blue-50/90 text-blue-800 border-blue-200/80',
    text: 'text-blue-800',
    border: 'border-blue-200/80',
    icon: Clock,
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    bg: 'bg-amber-50/90 text-amber-900 border-amber-200/80',
    text: 'text-amber-900',
    border: 'border-amber-200/80',
    icon: Search,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-emerald-50/90 text-emerald-900 border-emerald-200/80',
    text: 'text-emerald-900',
    border: 'border-emerald-200/80',
    icon: Wrench,
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-forest-50 text-forest-800 border-forest-200',
    text: 'text-forest-800',
    border: 'border-forest-200',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: XCircle,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-200',
    icon: Clock,
  };

  const Icon = config.icon;
  const sizeClasses =
    size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1.5 shadow-2xs'
      : 'px-2 py-0.5 text-[11px] gap-1 shadow-2xs';
  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border transition-all duration-150 ${config.bg} ${sizeClasses}`}
      title={`Status: ${config.label}`}
    >
      <Icon className={`${iconSize} shrink-0 opacity-80`} aria-hidden="true" />
      <span className="tracking-tight">{config.label}</span>
    </span>
  );
};

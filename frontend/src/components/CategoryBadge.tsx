import React from 'react';
import { ComplaintCategory, DisasterType } from '../types/complaint.ts';
import { Hammer, Lightbulb, Trash2, AlertTriangle } from 'lucide-react';

interface CategoryBadgeProps {
  category: ComplaintCategory;
  disasterType?: DisasterType | null;
  size?: 'sm' | 'md';
}

const CATEGORY_NAMES: Record<ComplaintCategory, string> = {
  POTHOLES: 'Pothole',
  STREET_LIGHTS: 'Street Light',
  GARBAGE: 'Garbage',
  DISASTERS: 'Disaster',
};

const CATEGORY_STYLES: Record<
  ComplaintCategory,
  { bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  POTHOLES: {
    bg: 'bg-amber-50/80',
    text: 'text-amber-800',
    border: 'border-amber-200/80',
    icon: Hammer,
  },
  STREET_LIGHTS: {
    bg: 'bg-sky-50/80',
    text: 'text-sky-800',
    border: 'border-sky-200/80',
    icon: Lightbulb,
  },
  GARBAGE: {
    bg: 'bg-emerald-50/80',
    text: 'text-emerald-800',
    border: 'border-emerald-200/80',
    icon: Trash2,
  },
  DISASTERS: {
    bg: 'bg-rose-50/80',
    text: 'text-rose-800',
    border: 'border-rose-200/80',
    icon: AlertTriangle,
  },
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  disasterType,
  size = 'sm',
}) => {
  const label = CATEGORY_NAMES[category] || category;
  const style = CATEGORY_STYLES[category] || {
    bg: 'bg-slate-100',
    text: 'text-slate-800',
    border: 'border-slate-200',
    icon: Hammer,
  };
  const IconComponent = style.icon;

  const sizeClasses = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  const iconSize = size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1.5 rounded-md font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses} shadow-2xs transition-all`}
      >
        <IconComponent className={iconSize} />
        <span>{label}</span>
      </span>

      {category === 'DISASTERS' && disasterType && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-100/80 text-rose-800 border border-rose-300/80 shadow-2xs"
        >
          {disasterType}
        </span>
      )}
    </div>
  );
};

import React from 'react';
import { ComplaintCategory, DisasterType } from '../types/complaint.ts';

interface CategoryBadgeProps {
  category: ComplaintCategory;
  disasterType?: DisasterType | null;
}

const CATEGORY_NAMES: Record<ComplaintCategory, string> = {
  POTHOLES: 'Pothole',
  STREET_LIGHTS: 'Street Light',
  GARBAGE: 'Garbage',
  DISASTERS: 'Disaster',
};

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category, disasterType }) => {
  const label = CATEGORY_NAMES[category] || category;

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
        {label}
      </span>
      {category === 'DISASTERS' && disasterType && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          {disasterType}
        </span>
      )}
    </div>
  );
};

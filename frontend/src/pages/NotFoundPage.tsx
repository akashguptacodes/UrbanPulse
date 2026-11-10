import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-20 sm:py-24 space-y-5 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-lg bg-forest-50 border border-forest-100 flex items-center justify-center mx-auto text-forest-800 shadow-2xs">
        <Compass className="w-8 h-8 text-emerald-700 animate-spin-slow" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-forest-950">404</h1>
        <h2 className="font-display text-lg sm:text-xl font-bold text-forest-900">Page Not Found</h2>
        <p className="text-xs sm:text-sm text-civic-muted leading-relaxed">
          The page you are looking for does not exist or has been relocated within the civic infrastructure network.
        </p>
      </div>
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-forest-900 hover:bg-forest-800 text-white rounded-md text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95"
        >
          <span>Return to Home</span>
          <ArrowRight className="w-4 h-4 text-lime-400" />
        </Link>
      </div>
    </div>
  );
};

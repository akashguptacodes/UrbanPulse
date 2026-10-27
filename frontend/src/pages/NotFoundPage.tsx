import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="text-center py-16 space-y-4">
      <h1 className="text-6xl font-extrabold text-slate-300">404</h1>
      <h2 className="text-xl font-bold text-slate-800">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        The page you are looking for does not exist or has not been implemented yet.
      </p>
      <Link
        to="/"
        className="inline-block mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded text-sm font-medium transition-colors"
      >
        Return to Home
      </Link>
    </div>
  );
};

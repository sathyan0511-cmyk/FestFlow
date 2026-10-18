import React from 'react';

const colorMap = {
  // Roles
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  organizer: 'bg-blue-100 text-blue-800 border-blue-200',
  student: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  // Event Types
  Technical: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Cultural: 'bg-pink-100 text-pink-800 border-pink-200',
  Sports: 'bg-amber-100 text-amber-800 border-amber-200',
  Workshop: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  Competition: 'bg-rose-100 text-rose-800 border-rose-200',
  Seminar: 'bg-teal-100 text-teal-800 border-teal-200',
  // Status
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  registered: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  ongoing: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
  draft: 'bg-amber-100 text-amber-800 border-amber-200'
};

export default function Badge({ children, variant, className = '' }) {
  const style = colorMap[variant] || 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
}

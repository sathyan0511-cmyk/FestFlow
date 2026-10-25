import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'neutral' }) {
  const iconAccents = {
    neutral: 'bg-canvas-muted text-ink-secondary border-edge',
    accent: 'bg-accent-subtle text-accent border-accent-border',
    success: 'bg-campus-success-subtle text-campus-success border-[#CCE4D9]',
    warning: 'bg-campus-warning-subtle text-campus-warning border-[#F5E4CA]',
    indigo: 'bg-[#EEF3FA] text-[#24426E] border-[#D4E0F0]',
    emerald: 'bg-campus-success-subtle text-campus-success border-[#CCE4D9]',
    amber: 'bg-campus-warning-subtle text-campus-warning border-[#F5E4CA]',
    rose: 'bg-campus-error-subtle text-campus-error border-[#F4D0D0]',
  };

  const accentClass = iconAccents[color] || iconAccents.neutral;

  return (
    <div className="bg-surface-primary rounded-xl p-5 border border-edge shadow-fest-sm hover:border-edge-dark transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</p>
          <h3 className="text-2xl font-bold text-ink-primary mt-1 tracking-tight font-sans">{value}</h3>
          {subtitle && (
            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${accentClass} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

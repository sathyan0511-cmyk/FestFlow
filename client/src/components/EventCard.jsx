import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Building2, ArrowUpRight } from 'lucide-react';
import Badge from './Badge';

// Curated graphic banners for events without a custom cover image
const categoryPatterns = {
  Technical: {
    bg: 'from-[#1E293B] via-[#0F172A] to-[#1E3A5F]',
    pattern: 'radial-gradient(circle at 80% 20%, rgba(56, 189, 248, 0.15) 0%, transparent 50%)',
    tag: 'CODE & TECH',
  },
  Cultural: {
    bg: 'from-[#451A14] via-[#2A100C] to-[#6E2A1C]',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(217, 75, 53, 0.25) 0%, transparent 60%)',
    tag: 'STAGE & ARTS',
  },
  Sports: {
    bg: 'from-[#14342B] via-[#0D231C] to-[#1F4E3F]',
    pattern: 'radial-gradient(circle at 75% 30%, rgba(35, 122, 87, 0.3) 0%, transparent 55%)',
    tag: 'ATHLETICS',
  },
  Workshop: {
    bg: 'from-[#382315] via-[#24160C] to-[#54331C]',
    pattern: 'radial-gradient(circle at 30% 20%, rgba(200, 110, 50, 0.2) 0%, transparent 50%)',
    tag: 'MASTERCLASS',
  },
  Competition: {
    bg: 'from-[#2D2115] via-[#1B1309] to-[#4A341E]',
    pattern: 'radial-gradient(circle at 85% 70%, rgba(212, 160, 23, 0.25) 0%, transparent 50%)',
    tag: 'HACK & COMPETE',
  },
  default: {
    bg: 'from-[#1F2421] via-[#141715] to-[#2E3631]',
    pattern: 'none',
    tag: 'CAMPUS EVENT',
  }
};

export default function EventCard({ event, onQuickRegister, isRegistering = false, isUserRegistered = false }) {
  const dateObj = new Date(event.startDate);
  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayStr = dateObj.toLocaleDateString('en-US', { day: '2-digit' });

  const percentFull = Math.min(
    100,
    Math.round(((event.registeredCount || 0) / (event.maxParticipants || 1)) * 100)
  );

  const visualTheme = categoryPatterns[event.eventType] || categoryPatterns.default;

  return (
    <article className="fest-card overflow-hidden flex flex-col justify-between group h-full">
      <div>
        {/* Visual Banner Header */}
        <Link to={`/events/${event._id}`} className="block relative h-44 overflow-hidden bg-slate-900">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${visualTheme.bg} p-5 flex flex-col justify-between text-white relative`}
              style={{ backgroundImage: visualTheme.pattern }}
            >
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-white/70 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                  {visualTheme.tag}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-white text-ink-primary shadow-fest-sm">
                  {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
                </span>
              </div>

              <div className="z-10">
                <p className="text-[11px] font-medium text-white/80 line-clamp-1">{event.club?.name || 'Campus Club'}</p>
                <h4 className="font-display text-lg font-semibold text-white tracking-tight line-clamp-1 mt-0.5">
                  {event.title}
                </h4>
              </div>

              {/* Decorative subtle grid overlay */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              />
            </div>
          )}

          {/* Date Stacking Badge */}
          <div className="absolute top-3 left-3 bg-surface-primary/95 backdrop-blur border border-edge rounded-md px-2.5 py-1 text-center shadow-fest-sm z-20">
            <span className="text-[10px] font-extrabold tracking-wider text-accent block leading-none">{monthStr}</span>
            <span className="text-base font-extrabold text-ink-primary block leading-tight">{dayStr}</span>
          </div>
        </Link>

        {/* Card Body */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Badge variant={event.eventType}>{event.eventType}</Badge>
            {event.category && (
              <span className="text-[11px] font-medium text-ink-muted">
                {event.category}
              </span>
            )}
          </div>

          <Link to={`/events/${event._id}`}>
            <h3 className="font-sans text-base font-bold text-ink-primary group-hover:text-accent transition-colors line-clamp-1 leading-snug">
              {event.title}
            </h3>
          </Link>

          <p className="text-xs text-ink-muted mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>

          {/* Metadata Rows */}
          <div className="mt-4 pt-3 border-t border-edge-light space-y-1.5 text-xs text-ink-secondary">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span className="truncate">{event.venue?.name || 'Campus Venue'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-ink-muted shrink-0" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
          </div>

          {/* Capacity Indicator */}
          <div className="mt-4 pt-3 border-t border-edge-light">
            <div className="flex items-center justify-between text-[11px] font-medium mb-1.5">
              <span className="text-ink-muted">Seats reserved</span>
              <span className={event.isFull ? 'text-campus-error font-semibold' : 'text-ink-secondary'}>
                {event.registeredCount || 0} / {event.maxParticipants} ({percentFull}%)
              </span>
            </div>
            <div className="w-full bg-surface-secondary h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  percentFull >= 95
                    ? 'bg-campus-error'
                    : percentFull >= 75
                    ? 'bg-campus-warning'
                    : 'bg-accent'
                }`}
                style={{ width: `${percentFull}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3.5 bg-canvas-warm/70 border-t border-edge flex items-center justify-between gap-3">
        <Link
          to={`/events/${event._id}`}
          className="text-xs font-semibold text-ink-secondary hover:text-accent flex items-center gap-1 transition-colors"
        >
          View Details <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        {isUserRegistered ? (
          <span className="text-[11px] font-semibold text-campus-success bg-campus-success-subtle px-2.5 py-1 rounded border border-[#CCE4D9]">
            ✓ Registered
          </span>
        ) : event.isFull ? (
          <span className="text-[11px] font-semibold text-campus-error bg-campus-error-subtle px-2.5 py-1 rounded border border-[#F4D0D0]">
            Sold Out
          </span>
        ) : event.isRegistrationClosed ? (
          <span className="text-[11px] font-semibold text-ink-muted bg-surface-secondary px-2.5 py-1 rounded">
            Closed
          </span>
        ) : onQuickRegister ? (
          <button
            onClick={() => onQuickRegister(event._id)}
            disabled={isRegistering}
            className="btn-accent py-1 px-3 text-xs"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        ) : (
          <Link
            to={`/events/${event._id}`}
            className="btn-accent py-1 px-3 text-xs"
          >
            Register
          </Link>
        )}
      </div>
    </article>
  );
}

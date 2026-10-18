import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Building2, ArrowRight } from 'lucide-react';
import Badge from './Badge';

export default function EventCard({ event, onQuickRegister, isRegistering = false, isUserRegistered = false }) {
  const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const percentFull = Math.min(
    100,
    Math.round(((event.registeredCount || 0) / (event.maxParticipants || 1)) * 100)
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div className="p-5">
        {/* Badges row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={event.eventType}>{event.eventType}</Badge>
            <span className="text-xs text-slate-500 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
              {event.category || 'General'}
            </span>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            {event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}
          </span>
        </div>

        {/* Title */}
        <Link to={`/events/${event._id}`}>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {event.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        {/* Info Grid */}
        <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{event.club?.name || 'Club'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue?.name || 'Venue'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{startDate}</span>
            <span className="text-slate-300">•</span>
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{event.startTime} - {event.endTime}</span>
          </div>
        </div>

        {/* Seat Capacity Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Seats Filled
            </span>
            <span className={event.isFull ? 'text-rose-600 font-semibold' : 'text-slate-700'}>
              {event.registeredCount || 0} / {event.maxParticipants} ({percentFull}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentFull >= 90
                  ? 'bg-rose-500'
                  : percentFull >= 60
                  ? 'bg-amber-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${percentFull}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Action */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          to={`/events/${event._id}`}
          className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        >
          View Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {isUserRegistered ? (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            ✓ Registered
          </span>
        ) : event.isFull ? (
          <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            Sold Out
          </span>
        ) : event.isRegistrationClosed ? (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Deadline Passed
          </span>
        ) : onQuickRegister ? (
          <button
            onClick={() => onQuickRegister(event._id)}
            disabled={isRegistering}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        ) : (
          <Link
            to={`/events/${event._id}`}
            className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Register
          </Link>
        )}
      </div>
    </div>
  );
}

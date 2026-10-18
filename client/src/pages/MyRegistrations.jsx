import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import { Ticket, Calendar, Clock, MapPin, Building2, QrCode, AlertCircle, Ban, CheckCircle2 } from 'lucide-react';

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/registrations/my');
      if (res.data.success) {
        setRegistrations(res.data.registrations);
      }
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const handleCancelRegistration = async (id) => {
    if (!window.confirm('Are you sure you want to cancel your registration for this event? Your seat will be freed up for other students.')) {
      return;
    }

    try {
      setCancellingId(id);
      setMessage('');
      const res = await api.put(`/registrations/${id}/cancel`, {
        reason: 'Cancelled by student from wallet'
      });
      if (res.data.success) {
        setMessage('Registration cancelled. Your ticket has been invalidated.');
        fetchRegistrations();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Retrieving your event passes..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Event Registrations & Passes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Present your e-ticket or ticket ID at the venue gate for check-in
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">You haven't registered for any events yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Explore exciting campus hackathons, workshops, and music festivals!
          </p>
          <Link
            to="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            Explore Events
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const event = reg.event;
            if (!event) return null;

            const isCancelled = reg.registrationStatus === 'cancelled';
            const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={reg._id}
                className={`bg-white rounded-2xl border ${
                  isCancelled ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-indigo-100 shadow-sm'
                } p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={reg.registrationStatus}>{reg.registrationStatus}</Badge>
                    <span className="text-xs font-semibold text-slate-500">
                      Ticket #{reg.ticketNumber}
                    </span>
                  </div>

                  <Link to={`/events/${event._id}`}>
                    <h3 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                      {event.title}
                    </h3>
                  </Link>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{startDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{event.venue?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket badge & cancel button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-center sm:text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">
                      <QrCode className="w-4 h-4 text-indigo-600" />
                      <span>{reg.ticketNumber}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Present at venue entrance</p>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelRegistration(reg._id)}
                      disabled={cancellingId === reg._id}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {cancellingId === reg._id ? 'Cancelling...' : 'Cancel Registration'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

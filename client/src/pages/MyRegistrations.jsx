import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import { Ticket, Calendar, Clock, MapPin, QrCode, Ban, CheckCircle2, ArrowRight } from 'lucide-react';

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState('');

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/registrations/my');
      if (res.data?.success && Array.isArray(res.data.registrations)) {
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
    if (!window.confirm('Cancel this event pass? Your reserved seat will be surrendered back to the campus pool.')) {
      return;
    }

    try {
      setCancellingId(id);
      setMessage('');
      const res = await api.put(`/registrations/${id}/cancel`, {
        reason: 'Cancelled by student from wallet'
      });
      if (res.data?.success) {
        setMessage('Registration voided. The admission pass has been invalidated.');
        fetchRegistrations();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel registration.');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving your digital festival passes..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Student Wallet
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Admissions & Credentials</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            My Event Passes
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Official digital entry passes. Present ticket ID or QR code at campus check-in kiosks.
          </p>
        </div>

        <Link
          to="/events"
          className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Find More Events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2.5 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {registrations.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
          <Ticket className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">No Event Passes Found</h3>
          <p className="text-xs text-ink-muted mt-1 mb-5">
            You haven't claimed any festival or hackathon tickets yet. Explore open events across campus!
          </p>
          <Link
            to="/events"
            className="btn-accent text-xs px-5 py-2.5 inline-flex items-center gap-2"
          >
            <span>Browse Campus Events</span>
            <ArrowRight className="w-4 h-4" />
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
                className={`bg-surface-primary rounded-xl border ${
                  isCancelled
                    ? 'border-surface-border opacity-50 bg-surface-secondary/40'
                    : 'border-surface-border shadow-subtle hover:border-brand-accent/40'
                } p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all relative overflow-hidden`}
              >
                {/* Left Ticket Notch */}
                <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-canvas-warm border border-surface-border" />

                <div className="space-y-3 flex-1 md:pl-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={reg.registrationStatus}>{reg.registrationStatus}</Badge>
                    <span className="font-mono text-2xs text-ink-muted bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
                      PASS #{reg.ticketNumber}
                    </span>
                    <Badge variant="outline" size="sm">{event.category || 'General'}</Badge>
                  </div>

                  <Link to={`/events/${event._id}`}>
                    <h3 className="font-display font-bold text-xl text-ink-primary hover:text-brand-accent transition-colors">
                      {event.title}
                    </h3>
                  </Link>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-ink-secondary pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-accent shrink-0" />
                      <span>{startDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-brand-accent shrink-0" />
                      <span>{event.startTime} - {event.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-accent shrink-0" />
                      <span className="truncate">{event.venue?.name || 'Campus Venue'}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Stub Right Perforation */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t md:border-t-0 md:border-l border-dashed border-surface-border pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-secondary rounded-lg text-xs font-mono font-bold text-ink-primary border border-surface-border">
                      <QrCode className="w-4 h-4 text-brand-accent" />
                      <span>{reg.ticketNumber}</span>
                    </div>
                    <p className="text-2xs font-mono text-ink-muted mt-1">Official Gate Pass</p>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelRegistration(reg._id)}
                      disabled={cancellingId === reg._id}
                      className="px-3 py-1.5 text-xs font-medium text-status-error hover:bg-rose-50 rounded-lg border border-surface-border transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{cancellingId === reg._id ? 'Cancelling...' : 'Cancel Pass'}</span>
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

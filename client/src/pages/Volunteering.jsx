import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { HeartHandshake, Clock, Calendar, CheckCircle2, PlusCircle, UserCheck } from 'lucide-react';

export default function Volunteering() {
  const [volunteering, setVolunteering] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    eventId: '',
    preferredTask: 'Participant Registration Desk & Badge Distribution'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [volRes, eventsRes] = await Promise.all([
        api.get('/volunteers/my'),
        api.get('/events?upcoming=true')
      ]);

      if (volRes.data?.success && Array.isArray(volRes.data.volunteering)) {
        setVolunteering(volRes.data.volunteering);
      }
      if (eventsRes.data?.success && Array.isArray(eventsRes.data.events) && eventsRes.data.events.length > 0) {
        setEvents(eventsRes.data.events);
        setForm((prev) => ({ ...prev, eventId: eventsRes.data.events[0]._id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/volunteers/apply', form);
      if (res.data?.success) {
        setIsApplyModalOpen(false);
        setMsg('Application submitted! Club coordinators will assign your duty shift shortly.');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying campus volunteer corps & shift logs..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Student Leadership
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Volunteer Corps</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Volunteer Operations
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Support university festivals, lead crowd coordination, and earn official volunteer service hours.
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Apply as Volunteer</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* My Volunteering Assignments */}
      <div className="space-y-4">
        <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-bold">
          My Active Deployments & Shifts ({volunteering.length})
        </h3>

        {volunteering.length === 0 ? (
          <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
            <HeartHandshake className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
            <h4 className="font-display font-bold text-base text-ink-primary">No Active Volunteer Deployments</h4>
            <p className="text-xs text-ink-muted mt-1">
              Apply using the button above to support upcoming campus festivals and symposiums.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {volunteering.map((vol) => (
              <div
                key={vol._id}
                className="bg-surface-primary p-5 rounded-xl border border-surface-border shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={vol.volunteerStatus}>{vol.volunteerStatus}</Badge>
                    <span className="text-xs font-medium text-ink-secondary">
                      Festival: {vol.event?.title}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-base text-ink-primary">{vol.assignedTask}</h4>
                  <div className="flex items-center gap-3 text-xs text-ink-muted mt-1 font-mono text-2xs">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-brand-accent" />
                      Shift: {vol.shiftStart || '09:00'} - {vol.shiftEnd || '17:00'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-2xs text-ink-muted">
                  <span className="bg-surface-secondary px-2.5 py-1 rounded border border-surface-border">
                    Certificate Eligible
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Volunteer Deployment Application">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Target Festival / Event *</label>
            <select
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              className="input-field text-sm"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Preferred Duty Track *</label>
            <select
              value={form.preferredTask}
              onChange={(e) => setForm({ ...form, preferredTask: e.target.value })}
              className="input-field text-sm"
            >
              <option value="Participant Registration Desk & Badge Distribution">Registration Desk & Attendee Check-In</option>
              <option value="Stage Management, AV & Guest Hospitality">Stage Operations & Keynote Hospitality</option>
              <option value="Crowd Management & Venue Ushering">Crowd Logistics & Auditorium Ushering</option>
              <option value="Technical Lab Setup & Network Support">Technical Lab Infrastructure & Wi-Fi</option>
              <option value="Social Media & Photography Squad">Photography, Videography & Social Press</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Volunteer Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

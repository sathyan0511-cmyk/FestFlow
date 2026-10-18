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

      if (volRes.data.success) {
        setVolunteering(volRes.data.volunteering);
      }
      if (eventsRes.data.success && eventsRes.data.events.length > 0) {
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
      const res = await api.post('/volunteers/apply', form);
      if (res.data.success) {
        setIsApplyModalOpen(false);
        setMsg('Application submitted! Club coordinators will assign your shift shortly.');
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit application');
    }
  };

  if (loading) return <LoadingSpinner message="Loading volunteer opportunities & shifts..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Volunteering Portal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Apply to support campus festivals, coordinate crowds, and manage event operations
          </p>
        </div>

        <button
          onClick={() => setIsApplyModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Apply as Volunteer
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* My Volunteering Assignments */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          My Active Shifts & Volunteer Records ({volunteering.length})
        </h3>

        {volunteering.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500">
            <HeartHandshake className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No active volunteer roles</h4>
            <p className="mt-1">Apply above to join the volunteer crew for upcoming college fests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {volunteering.map((vol) => (
              <div
                key={vol._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={vol.volunteerStatus}>{vol.volunteerStatus}</Badge>
                    <span className="text-xs text-slate-400 font-medium">
                      Event: {vol.event?.title}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{vol.assignedTask}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Shift: {vol.shiftStart || '09:00'} - {vol.shiftEnd || '17:00'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    Official Crew Pass Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Volunteer Application">
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Event *</label>
            <select
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Volunteer Role *</label>
            <select
              value={form.preferredTask}
              onChange={(e) => setForm({ ...form, preferredTask: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Participant Registration Desk & Badge Distribution">Registration & Badge Desk</option>
              <option value="Stage Management & Audio-Visual Control">Stage Management & AV</option>
              <option value="Hospitality & Guest Reception">Hospitality & Chief Guest Reception</option>
              <option value="Crowd Coordination & Security Escort">Crowd Coordination</option>
              <option value="Competition Scoring & Proctoring">Judging / Scoring Runner</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Submit Application</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

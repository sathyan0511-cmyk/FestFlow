import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Briefcase, Building, Mail, Phone, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventSponsorships, setEventSponsorships] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);

  // Modals
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  // Forms
  const [sponsorForm, setSponsorForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    organizationType: 'corporate',
    address: ''
  });

  const [linkForm, setLinkForm] = useState({
    sponsorId: '',
    sponsorshipType: 'Title',
    sponsorshipAmount: 50000
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sponsorsRes, eventsRes] = await Promise.all([
        api.get('/sponsors'),
        api.get('/events')
      ]);

      if (sponsorsRes.data.success) {
        setSponsors(sponsorsRes.data.sponsors);
        if (sponsorsRes.data.sponsors.length > 0) {
          setLinkForm((prev) => ({ ...prev, sponsorId: sponsorsRes.data.sponsors[0]._id }));
        }
      }

      if (eventsRes.data.success && eventsRes.data.events.length > 0) {
        setEvents(eventsRes.data.events);
        setSelectedEventId(eventsRes.data.events[0]._id);
        loadEventSponsors(eventsRes.data.events[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventSponsors = async (eventId) => {
    try {
      const res = await api.get(`/sponsors/event/${eventId}`);
      if (res.data.success) {
        setEventSponsorships(res.data.sponsorships);
        setTotalRaised(res.data.totalSponsorship || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSponsor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/sponsors', sponsorForm);
      if (res.data.success) {
        setIsSponsorModalOpen(false);
        setSponsorForm({ name: '', contactPerson: '', email: '', phone: '', organizationType: 'corporate', address: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create sponsor');
    }
  };

  const handleLinkSponsor = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/sponsors/event', {
        ...linkForm,
        eventId: selectedEventId
      });
      if (res.data.success) {
        setIsLinkModalOpen(false);
        loadEventSponsors(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to link sponsorship');
    }
  };

  if (loading) return <LoadingSpinner message="Loading sponsorship portfolios..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsors & Corporate Partnerships</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track industry sponsors, title packages, and funds received per campus festival
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSponsorModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Add Sponsor
          </button>
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Link to Event
          </button>
        </div>
      </div>

      {/* Event Selector & Raised summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Event Sponsorships:</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              loadEventSponsors(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-500">Total Sponsorship Secured:</span>
          <p className="text-lg font-extrabold text-emerald-600">₹{totalRaised.toLocaleString()}</p>
        </div>
      </div>

      {/* Event Sponsorships List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Confirmed Event Sponsors ({eventSponsorships.length})
        </h3>

        {eventSponsorships.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            No sponsors linked to this event yet. Click "Link to Event" above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventSponsorships.map((es) => (
              <div key={es._id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {es.sponsorshipType} Sponsor
                    </span>
                    <Badge variant={es.sponsorshipStatus}>{es.sponsorshipStatus}</Badge>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{es.sponsor?.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Contact: {es.sponsor?.contactPerson}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Grant Amount:</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    ₹{es.sponsorshipAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Registered Sponsors Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Partner Organization Directory ({sponsors.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => (
            <div key={s._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">{s.organizationType}</span>
              <h4 className="font-bold text-slate-900 text-sm mt-0.5">{s.name}</h4>
              <p className="text-slate-600 mt-1">Lead: {s.contactPerson}</p>
              <div className="mt-2 text-slate-500 space-y-0.5">
                {s.email && <p className="truncate">✉ {s.email}</p>}
                {s.phone && <p>📞 {s.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Sponsor Modal */}
      <Modal isOpen={isSponsorModalOpen} onClose={() => setIsSponsorModalOpen(false)} title="Register Sponsor Organization">
        <form onSubmit={handleCreateSponsor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Org Name *</label>
            <input
              type="text"
              required
              value={sponsorForm.name}
              onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person *</label>
              <input
                type="text"
                required
                value={sponsorForm.contactPerson}
                onChange={(e) => setSponsorForm({ ...sponsorForm, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={sponsorForm.organizationType}
                onChange={(e) => setSponsorForm({ ...sponsorForm, organizationType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="corporate">Corporate</option>
                <option value="startup">Startup</option>
                <option value="tech">Tech Giant</option>
                <option value="education">EdTech</option>
                <option value="ngo">NGO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={sponsorForm.email}
                onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={sponsorForm.phone}
                onChange={(e) => setSponsorForm({ ...sponsorForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsSponsorModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Save Sponsor</button>
          </div>
        </form>
      </Modal>

      {/* Link Sponsor Modal */}
      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Link Sponsor to Event">
        <form onSubmit={handleLinkSponsor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Sponsor *</label>
            <select
              value={linkForm.sponsorId}
              onChange={(e) => setLinkForm({ ...linkForm, sponsorId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {sponsors.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.contactPerson})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Package Tier *</label>
              <select
                value={linkForm.sponsorshipType}
                onChange={(e) => setLinkForm({ ...linkForm, sponsorshipType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Title">Title Sponsor</option>
                <option value="Platinum">Platinum Sponsor</option>
                <option value="Gold">Gold Sponsor</option>
                <option value="Silver">Silver Sponsor</option>
                <option value="Associate">Associate Sponsor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                required
                min={0}
                value={linkForm.sponsorshipAmount}
                onChange={(e) => setLinkForm({ ...linkForm, sponsorshipAmount: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Confirm Sponsorship</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

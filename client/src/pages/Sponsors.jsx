import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Briefcase, Building, Mail, Phone, PlusCircle, CheckCircle2, TrendingUp } from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

export default function Sponsors() {
  const [sponsors, setSponsors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventSponsorships, setEventSponsorships] = useState([]);
  const [totalRaised, setTotalRaised] = useState(0);

  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [submittingSponsor, setSubmittingSponsor] = useState(false);
  const [submittingLink, setSubmittingLink] = useState(false);

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

      if (sponsorsRes.data?.success && Array.isArray(sponsorsRes.data.sponsors)) {
        setSponsors(sponsorsRes.data.sponsors);
        if (sponsorsRes.data.sponsors.length > 0) {
          setLinkForm((prev) => ({ ...prev, sponsorId: sponsorsRes.data.sponsors[0]._id }));
        }
      }

      if (eventsRes.data?.success && Array.isArray(eventsRes.data.events) && eventsRes.data.events.length > 0) {
        setEvents(eventsRes.data.events);
        setSelectedEventId(eventsRes.data.events[0]._id);
        await loadEventSponsors(eventsRes.data.events[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadEventSponsors = async (eventId) => {
    if (!eventId) return;
    try {
      const res = await api.get(`/sponsors/event/${eventId}`);
      if (res.data?.success) {
        setEventSponsorships(res.data.sponsorships || []);
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
      setSubmittingSponsor(true);
      const res = await api.post('/sponsors', sponsorForm);
      if (res.data?.success) {
        setIsSponsorModalOpen(false);
        setSponsorForm({ name: '', contactPerson: '', email: '', phone: '', organizationType: 'corporate', address: '' });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create sponsor');
    } finally {
      setSubmittingSponsor(false);
    }
  };

  const handleLinkSponsor = async (e) => {
    e.preventDefault();
    try {
      setSubmittingLink(true);
      const res = await api.post('/sponsors/event', {
        ...linkForm,
        eventId: selectedEventId
      });
      if (res.data?.success) {
        setIsLinkModalOpen(false);
        loadEventSponsors(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to link sponsorship');
    } finally {
      setSubmittingLink(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Reconciling corporate partnership contracts..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              External Affairs
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Corporate Alliances</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Sponsorships & Partners
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Manage industry grants, associate sponsorships, and corporate brand tie-ups per festival.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsSponsorModalOpen(true)}
            className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-brand-accent" />
            <span>Add Partner</span>
          </button>
          <button
            onClick={() => setIsLinkModalOpen(true)}
            className="btn-accent text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Link to Festival</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="sponsor-event-select" className="text-xs font-semibold text-ink-secondary whitespace-nowrap">
            Festival Ledger:
          </label>
          <select
            id="sponsor-event-select"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              loadEventSponsors(e.target.value);
            }}
            className="px-3.5 py-1.5 text-xs font-medium bg-surface-primary border border-surface-border rounded-lg shadow-subtle"
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-muted">Total Grants Secured</span>
          <p className="text-xl font-mono font-bold text-status-success mt-0.5">₹{formatINR(totalRaised)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-bold">
          Active Festival Sponsorships ({eventSponsorships.length})
        </h3>

        {eventSponsorships.length === 0 ? (
          <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-8 text-center text-xs text-ink-muted">
            No sponsors linked to this festival yet. Click "Link to Festival" above to allocate grants.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventSponsorships.map((es) => (
              <div key={es._id} className="bg-surface-primary p-5 rounded-xl border border-surface-border shadow-subtle flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-2xs uppercase font-bold text-brand-accent bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
                      {es.sponsorshipType} Tier
                    </span>
                    <Badge variant={es.sponsorshipStatus}>{es.sponsorshipStatus}</Badge>
                  </div>
                  <h4 className="font-display font-bold text-base text-ink-primary mt-1">{es.sponsor?.name}</h4>
                  <p className="text-xs text-ink-muted mt-0.5">Liaison: {es.sponsor?.contactPerson}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                  <span className="font-mono text-2xs text-ink-muted">Grant Amount</span>
                  <span className="font-mono font-bold text-status-success text-sm">
                    ₹{formatINR(es.sponsorshipAmount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
        <h3 className="font-display font-bold text-base text-ink-primary mb-4 pb-3 border-b border-surface-border">
          Corporate Directory ({sponsors.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sponsors.map((s) => (
            <div key={s._id} className="p-4 rounded-lg bg-surface-secondary/40 border border-surface-border text-xs">
              <span className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold">{s.organizationType}</span>
              <h4 className="font-display font-bold text-ink-primary text-sm mt-1">{s.name}</h4>
              <p className="text-ink-secondary mt-1">Liaison: {s.contactPerson}</p>
              <div className="mt-3 text-ink-muted space-y-1 font-mono text-2xs">
                {s.email && <p className="truncate">✉ {s.email}</p>}
                {s.phone && <p>📞 {s.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isSponsorModalOpen} onClose={() => setIsSponsorModalOpen(false)} title="Register Partner Organization">
        <form onSubmit={handleCreateSponsor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Company / Organization *</label>
            <input
              type="text"
              required
              value={sponsorForm.name}
              onChange={(e) => setSponsorForm({ ...sponsorForm, name: e.target.value })}
              placeholder="e.g. Google Cloud, Red Bull"
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Contact Liaison *</label>
              <input
                type="text"
                required
                value={sponsorForm.contactPerson}
                onChange={(e) => setSponsorForm({ ...sponsorForm, contactPerson: e.target.value })}
                placeholder="e.g. Anandita Roy"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Sector</label>
              <select
                value={sponsorForm.organizationType}
                onChange={(e) => setSponsorForm({ ...sponsorForm, organizationType: e.target.value })}
                className="input-field text-sm"
              >
                <option value="corporate">Corporate</option>
                <option value="startup">Startup</option>
                <option value="tech">Technology</option>
                <option value="education">EdTech</option>
                <option value="ngo">NGO / Foundation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Email</label>
              <input
                type="email"
                value={sponsorForm.email}
                onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })}
                placeholder="sponsor@brand.com"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={sponsorForm.phone}
                onChange={(e) => setSponsorForm({ ...sponsorForm, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button type="button" onClick={() => setIsSponsorModalOpen(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
            <button type="submit" disabled={submittingSponsor} className="btn-accent text-xs px-5 py-2 disabled:opacity-50">
              {submittingSponsor ? 'Saving...' : 'Save Partner'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} title="Allocate Sponsorship to Festival">
        <form onSubmit={handleLinkSponsor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Select Partner Organization *</label>
            <select
              value={linkForm.sponsorId}
              onChange={(e) => setLinkForm({ ...linkForm, sponsorId: e.target.value })}
              className="input-field text-sm"
            >
              {sponsors.map((s) => (
                <option key={s._id} value={s._id}>{s.name} ({s.contactPerson})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Package Tier *</label>
              <select
                value={linkForm.sponsorshipType}
                onChange={(e) => setLinkForm({ ...linkForm, sponsorshipType: e.target.value })}
                className="input-field text-sm"
              >
                <option value="Title">Title Sponsor</option>
                <option value="Platinum">Platinum Sponsor</option>
                <option value="Gold">Gold Sponsor</option>
                <option value="Silver">Silver Sponsor</option>
                <option value="Associate">Associate Sponsor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Grant Amount (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={linkForm.sponsorshipAmount}
                onChange={(e) => setLinkForm({ ...linkForm, sponsorshipAmount: e.target.value })}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button type="button" onClick={() => setIsLinkModalOpen(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
            <button type="submit" disabled={submittingLink} className="btn-accent text-xs px-5 py-2 disabled:opacity-50">
              {submittingLink ? 'Linking...' : 'Confirm Sponsorship'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

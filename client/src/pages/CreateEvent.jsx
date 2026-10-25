import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, PlusCircle, AlertCircle, Sparkles, Building2 } from 'lucide-react';

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [clubs, setClubs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'Technical',
    category: 'Software & AI',
    startDate: '',
    endDate: '',
    startTime: '10:00',
    endTime: '16:00',
    club: '',
    venue: '',
    maxParticipants: 100,
    registrationDeadline: '',
    registrationFee: 0,
    chiefGuest: '',
    status: 'published'
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const clubsEndpoint = role === 'admin' ? '/clubs' : '/clubs/my-authorized';
        const [clubsRes, venuesRes] = await Promise.all([
          api.get(clubsEndpoint).catch(async () => {
            const allClubsRes = await api.get('/clubs');
            if (allClubsRes.data?.success && role === 'organizer') {
              const authorizedIds = new Set((user?.authorizedClubs || []).map(c => (c?._id || c)?.toString()));
              return {
                data: {
                  success: true,
                  clubs: allClubsRes.data.clubs.filter(c =>
                    authorizedIds.has(c._id.toString()) ||
                    c.organizers?.some(o => (o._id || o).toString() === (user?.id || user?._id)?.toString())
                  )
                }
              };
            }
            return allClubsRes;
          }),
          api.get('/venues')
        ]);

        if (clubsRes.data?.success && Array.isArray(clubsRes.data.clubs)) {
          setClubs(clubsRes.data.clubs);
          if (clubsRes.data.clubs.length > 0) {
            setFormData((prev) => ({ ...prev, club: clubsRes.data.clubs[0]._id }));
          }
        }

        if (venuesRes.data?.success && Array.isArray(venuesRes.data.venues)) {
          setVenues(venuesRes.data.venues);
          if (venuesRes.data.venues.length > 0) {
            setFormData((prev) => ({ ...prev, venue: venuesRes.data.venues[0]._id }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch dropdown options:', err);
        setError('Failed to load clubs or venues from database.');
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [role, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (clubs.length === 0 || !formData.club) {
      setError('You are not authorized to create events for any club.');
      return;
    }

    // Capacity check against selected venue
    const selectedVenue = venues.find((v) => v._id === formData.venue);
    if (selectedVenue && Number(formData.maxParticipants) > selectedVenue.capacity) {
      setError(`Max participants cannot exceed ${selectedVenue.name}'s seating capacity (${selectedVenue.capacity}).`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/events', formData);
      if (res.data?.success && res.data.event?._id) {
        navigate(`/events/${res.data.event._id}`);
      } else {
        navigate('/events');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying venue capacities and club registries..." />;
  }

  const selectedVenue = venues.find((v) => v._id === formData.venue);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>

      <div className="bg-surface-primary rounded-xl border border-surface-border p-6 sm:p-8 shadow-subtle">
        <div className="mb-6 pb-5 border-b border-surface-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Event Operations
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Organizer Portal</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-primary tracking-tight">
            Schedule a New Campus Event
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Specify festival agenda, assign campus auditoriums, configure registration limits, and publish to the roster.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Event Identity */}
          <div className="space-y-4">
            <h3 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold">
              1. Event Identity & Scope
            </h3>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. CodeStorm 2026: Annual Inter-College Hackathon"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Comprehensive Description *
              </label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Detail the event agenda, keynote topics, rules, and participant prerequisites..."
                className="input-field text-sm font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Event Type *
                </label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  className="input-field text-sm"
                >
                  <option value="Technical">Technical</option>
                  <option value="Cultural">Cultural</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Seminar">Seminar</option>
                  <option value="Competition">Competition</option>
                  <option value="Fest">Fest</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Sub-Category / Domain
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g. Software & AI, Classical Dance, Robotics"
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hosting Body & Venue */}
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <h3 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold">
              2. Organizing Club & Campus Venue
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Organizing Student Society / Club *
                </label>
                {clubs.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>No Authorized Clubs Assigned</span>
                    </div>
                    <p className="text-2xs text-amber-700 leading-relaxed">
                      You are not assigned as an organizer to any registered campus clubs. Contact an administrator to receive club permissions before scheduling.
                    </p>
                  </div>
                ) : (
                  <select
                    name="club"
                    required
                    value={formData.club}
                    onChange={handleChange}
                    className="input-field text-sm"
                  >
                    {clubs.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Campus Venue Facility *
                </label>
                <select
                  name="venue"
                  required
                  value={formData.venue}
                  onChange={handleChange}
                  className="input-field text-sm"
                >
                  {venues.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} (Capacity: {v.capacity})
                    </option>
                  ))}
                </select>
                {selectedVenue && (
                  <p className="text-2xs text-ink-muted mt-1 font-mono">
                    Facility: {selectedVenue.location} • Max capacity: {selectedVenue.capacity} seats
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Timing */}
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <h3 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold">
              3. Schedule & Hours
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Admissions & Guests */}
          <div className="space-y-4 pt-4 border-t border-surface-border">
            <h3 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold">
              4. Registration Controls & Guests
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Max Participants *
                </label>
                <input
                  type="number"
                  name="maxParticipants"
                  required
                  min="1"
                  max={selectedVenue?.capacity || 1000}
                  value={formData.maxParticipants}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  RSVP Deadline *
                </label>
                <input
                  type="date"
                  name="registrationDeadline"
                  required
                  value={formData.registrationDeadline}
                  onChange={handleChange}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Entry Fee (₹)
                </label>
                <input
                  type="number"
                  name="registrationFee"
                  min="0"
                  value={formData.registrationFee}
                  onChange={handleChange}
                  placeholder="0 for complimentary"
                  className="input-field text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Chief Guest / Keynote Speaker (Optional)
              </label>
              <input
                type="text"
                name="chiefGuest"
                value={formData.chiefGuest}
                onChange={handleChange}
                placeholder="e.g. Dr. S. K. Patel, Dean of Academic Research"
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-surface-border flex items-center justify-end gap-3">
            <Link
              to="/events"
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || clubs.length === 0}
              className="btn-accent text-xs px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{submitting ? 'Publishing Event...' : 'Publish to Roster'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

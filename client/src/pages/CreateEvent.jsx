import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { ArrowLeft, Calendar, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function CreateEvent() {
  const navigate = useNavigate();

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
        const [clubsRes, venuesRes] = await Promise.all([
          api.get('/clubs'),
          api.get('/venues')
        ]);

        if (clubsRes.data.success) {
          setClubs(clubsRes.data.clubs);
          if (clubsRes.data.clubs.length > 0) {
            setFormData((prev) => ({ ...prev, club: clubsRes.data.clubs[0]._id }));
          }
        }

        if (venuesRes.data.success) {
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
  }, []);

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

    // Capacity check against selected venue
    const selectedVenue = venues.find((v) => v._id === formData.venue);
    if (selectedVenue && Number(formData.maxParticipants) > selectedVenue.capacity) {
      setError(`Max participants cannot exceed ${selectedVenue.name}'s capacity (${selectedVenue.capacity}).`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/events', formData);
      if (res.data.success) {
        navigate(`/events/${res.data.event._id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading venue and club directories..." />;

  const selectedVenue = venues.find((v) => v._id === formData.venue);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Event Organizer Portal
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Host a New College Event</h1>
          <p className="text-xs text-slate-500 mt-1">
            Define schedule, assign campus venues, and open registrations
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. CodeStorm 2026: Annual Inter-College Coding Competition"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              placeholder="Provide a detailed description of the event agenda, rules, and speaker details..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Type and Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Event Type *
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Category / Domain
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="e.g. Web Dev, Music, Robotics"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Club and Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Organizing Club *
              </label>
              <select
                name="club"
                required
                value={formData.club}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {clubs.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Venue *
              </label>
              <select
                name="venue"
                required
                value={formData.venue}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} (Max: {v.capacity})
                  </option>
                ))}
              </select>
              {selectedVenue && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Location: {selectedVenue.location} • Capacity: {selectedVenue.capacity} seats
                </p>
              )}
            </div>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                required
                value={formData.startTime}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                required
                value={formData.endTime}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Capacity, Deadline & Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Participants *
              </label>
              <input
                type="number"
                name="maxParticipants"
                required
                min={1}
                max={selectedVenue?.capacity || 1000}
                value={formData.maxParticipants}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration Deadline *
              </label>
              <input
                type="date"
                name="registrationDeadline"
                required
                value={formData.registrationDeadline}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registration Fee (₹)
              </label>
              <input
                type="number"
                name="registrationFee"
                min={0}
                value={formData.registrationFee}
                onChange={handleChange}
                placeholder="0 for Free"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Chief Guest */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Guest / Keynote Speaker (Optional)
            </label>
            <input
              type="text"
              name="chiefGuest"
              value={formData.chiefGuest}
              onChange={handleChange}
              placeholder="e.g. Dr. S. K. Patel, Vice Chancellor"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/events"
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <PlusCircle className="w-4 h-4" />
              {submitting ? 'Creating Event...' : 'Publish Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { MapPin, Users, PlusCircle, CheckCircle2, Building } from 'lucide-react';

export default function Venues() {
  const { role } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: 200,
    venueType: 'Auditorium',
    facilityList: 'Projector & Screen, Sound System, Wi-Fi'
  });

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/venues');
      if (res.data?.success && Array.isArray(res.data.venues)) {
        setVenues(res.data.venues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateVenue = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const facilities = formData.facilityList
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
        .map((name) => ({ name, availabilityStatus: 'available' }));

      const res = await api.post('/venues', {
        name: formData.name,
        location: formData.location,
        capacity: Number(formData.capacity),
        venueType: formData.venueType,
        facilities
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          location: '',
          capacity: 200,
          venueType: 'Auditorium',
          facilityList: 'Projector & Screen, Sound System, Wi-Fi'
        });
        fetchVenues();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register venue.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Estate & Facilities
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Campus Logistics</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Venues & Auditoriums
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Check seating capacities, acoustic equipment, multimedia facilities, and reservation status.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Campus Venue</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Scanning campus facility registries..." />
      ) : venues.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
          <MapPin className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">No Venues Configured</h3>
          <p className="text-xs text-ink-muted mt-1">
            Configure campus auditoriums, seminar halls, and grounds using the button above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div
              key={venue._id}
              className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle hover:border-brand-accent/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant="outline">{venue.venueType}</Badge>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-ink-primary bg-surface-secondary px-2.5 py-0.5 rounded border border-surface-border">
                    <Users className="w-3.5 h-3.5 text-brand-accent" />
                    <span>{venue.capacity} Seats</span>
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg text-ink-primary">{venue.name}</h3>
                <p className="text-xs text-ink-muted mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                  <span>{venue.location}</span>
                </p>

                {/* Facilities List */}
                {venue.facilities && venue.facilities.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-surface-border">
                    <p className="font-mono text-2xs uppercase tracking-wider font-semibold text-ink-muted mb-2">
                      Equipped Amenities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded bg-surface-secondary text-ink-secondary border border-surface-border"
                        >
                          <CheckCircle2 className="w-3 h-3 text-status-success" />
                          {fac.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-ink-muted">
                <span className="font-mono text-2xs uppercase">Operational Status</span>
                <span className="font-mono text-2xs font-bold text-status-success capitalize flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  {venue.status || 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Venue Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Campus Venue">
        <form onSubmit={handleCreateVenue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Venue Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Vikram Sarabhai Main Auditorium"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Location / Block *</label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Science & Technology Quadrangle, Ground Floor"
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Seating Capacity *</label>
              <input
                type="number"
                name="capacity"
                required
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Facility Type</label>
              <select
                name="venueType"
                value={formData.venueType}
                onChange={handleChange}
                className="input-field text-sm"
              >
                <option value="Auditorium">Auditorium</option>
                <option value="Seminar Hall">Seminar Hall</option>
                <option value="Open Ground">Open Ground</option>
                <option value="Lab">Lab</option>
                <option value="Classroom">Classroom</option>
                <option value="Indoor Stadium">Indoor Stadium</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Equipped Amenities (comma-separated)
            </label>
            <input
              type="text"
              name="facilityList"
              value={formData.facilityList}
              onChange={handleChange}
              placeholder="Digital Projector, Acoustic PA System, High-speed Wi-Fi, HVAC"
              className="input-field text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

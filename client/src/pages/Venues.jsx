import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { MapPin, Users, PlusCircle, CheckCircle2, ShieldCheck, Building } from 'lucide-react';

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
      if (res.data.success) {
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

      if (res.data.success) {
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
      alert(err.response?.data?.message || 'Failed to create venue.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Venues & Auditoriums</h1>
          <p className="text-xs text-slate-500 mt-1">
            Check hall capacities, multimedia equipment, and availability for fests
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Campus Venue</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading venues..." />
      ) : venues.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No venues configured yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div
              key={venue._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {venue.venueType}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{venue.capacity} Seats</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{venue.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{venue.location}</span>
                </p>

                {/* Facilities List */}
                {venue.facilities && venue.facilities.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2">
                      Equipped Facilities
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {venue.facilities.map((fac, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {fac.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Status:</span>
                <span className="font-semibold text-emerald-600 capitalize">
                  ● {venue.status || 'Available'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Venue Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Campus Venue">
        <form onSubmit={handleCreateVenue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Vikram Sarabhai Seminar Hall"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Location Details *</label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Electrical Sciences Block, 2nd Floor"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (Seats) *</label>
              <input
                type="number"
                name="capacity"
                required
                min={1}
                value={formData.capacity}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Type</label>
              <select
                name="venueType"
                value={formData.venueType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Facilities (comma-separated)
            </label>
            <input
              type="text"
              name="facilityList"
              value={formData.facilityList}
              onChange={handleChange}
              placeholder="Projector, Central AC, High-speed Wi-Fi, Microphones"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Save Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Building2, Mail, Phone, Calendar, PlusCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function Clubs() {
  const { role } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Technical',
    contactEmail: '',
    contactPhone: '',
    facultyCoordinatorName: '',
    facultyCoordinatorEmail: '',
    facultyCoordinatorDept: ''
  });

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clubs');
      if (res.data.success) {
        setClubs(res.data.clubs);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load clubs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        contactEmail: formData.contactEmail,
        contactPhone: formData.contactPhone,
        facultyCoordinator: {
          name: formData.facultyCoordinatorName,
          email: formData.facultyCoordinatorEmail,
          department: formData.facultyCoordinatorDept
        }
      };

      const res = await api.post('/clubs', payload);
      if (res.data.success) {
        setIsModalOpen(false);
        setFormData({
          name: '',
          description: '',
          category: 'Technical',
          contactEmail: '',
          contactPhone: '',
          facultyCoordinatorName: '',
          facultyCoordinatorEmail: '',
          facultyCoordinatorDept: ''
        });
        fetchClubs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create club.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Clubs & Societies</h1>
          <p className="text-xs text-slate-500 mt-1">
            Student organizations organizing college fests, competitions, and technical workshops
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Club</span>
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading campus clubs..." />
      ) : clubs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No clubs registered yet</h3>
          <p className="text-xs text-slate-500 mt-1">Add the first student club using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div
              key={club._id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant={club.category}>{club.category}</Badge>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                    {club.eventCount || 0} Events
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">{club.name}</h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {club.description}
                </p>

                {club.facultyCoordinator?.name && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Faculty Coordinator:
                    </p>
                    <p className="mt-0.5">{club.facultyCoordinator.name} ({club.facultyCoordinator.department || 'Staff'})</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                {club.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{club.contactEmail}</span>
                  </div>
                )}
                {club.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{club.contactPhone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register a Campus Club">
        <form onSubmit={handleCreateClub} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Club Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. ACM Student Chapter"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              name="description"
              required
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the club's primary purpose and focus..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Literary">Literary</option>
                <option value="Social">Social</option>
                <option value="Arts">Arts</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="club@college.edu"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800 mb-2">Faculty Coordinator Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  name="facultyCoordinatorName"
                  value={formData.facultyCoordinatorName}
                  onChange={handleChange}
                  placeholder="Faculty Name"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="facultyCoordinatorDept"
                  value={formData.facultyCoordinatorDept}
                  onChange={handleChange}
                  placeholder="Department"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
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
              {submitting ? 'Registering...' : 'Save Club'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Building2, Mail, Phone, PlusCircle, AlertCircle, Sparkles, UserCheck } from 'lucide-react';

export default function Clubs() {
  const { role, user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scopeFilter, setScopeFilter] = useState('ALL');
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

  const isSupervisedByMe = (club) => {
    return (
      (user?.supervisedClubs || []).some(
        (id) => (id?._id || id)?.toString() === club._id?.toString()
      ) ||
      (club.facultyCoordinator?.user &&
        (club.facultyCoordinator.user?._id || club.facultyCoordinator.user)?.toString() ===
          (user?._id || user?.id)?.toString()) ||
      (club.facultyCoordinator?.email &&
        user?.email &&
        club.facultyCoordinator.email.toLowerCase() === user.email.toLowerCase())
    );
  };

  const isAssignedToMe = (club) => {
    const currentUserId = (user?._id || user?.id)?.toString();
    return (
      (club.organizers || []).some(
        (o) => (o?._id || o)?.toString() === currentUserId
      ) ||
      (user?.authorizedClubs || []).some(
        (id) => (id?._id || id)?.toString() === club._id?.toString()
      )
    );
  };

  const canManage = (club) => {
    if (role === 'admin') return true;
    if (role === 'faculty') return isSupervisedByMe(club);
    if (role === 'organizer') return isAssignedToMe(club);
    return false;
  };

  const fetchClubs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clubs');
      if (res.data?.success && Array.isArray(res.data.clubs)) {
        setClubs(res.data.clubs);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load campus club directory.');
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
      if (res.data?.success) {
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
      alert(err.response?.data?.message || 'Failed to register club.');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  const myClubsCount = clubs.filter((c) =>
    role === 'faculty' ? isSupervisedByMe(c) : isAssignedToMe(c)
  ).length;

  const displayClubs = clubs.filter((c) => {
    if (scopeFilter === 'MY') {
      if (role === 'faculty') return isSupervisedByMe(c);
      if (role === 'organizer') return isAssignedToMe(c);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Campus Guilds
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Registered Societies</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Clubs & Societies
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Directory of chartered student bodies organizing university fests, hackathons, and symposiums.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(role === 'faculty' || role === 'organizer') && (
            <div className="flex items-center bg-surface-secondary p-1 rounded-lg border border-surface-border">
              <button
                onClick={() => setScopeFilter('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  scopeFilter === 'ALL'
                    ? 'bg-white text-ink-primary shadow-subtle'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                All Clubs ({clubs.length})
              </button>
              <button
                onClick={() => setScopeFilter('MY')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  scopeFilter === 'MY'
                    ? 'bg-white text-ink-primary shadow-subtle'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
              >
                {role === 'faculty' ? 'Supervised by Me' : 'My Clubs'} ({myClubsCount})
              </button>
            </div>
          )}

          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Charter New Club</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Scanning student societies register..." />
      ) : displayClubs.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
          <Building2 className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">
            {scopeFilter === 'MY' ? 'No Clubs Assigned' : 'No Registered Clubs'}
          </h3>
          <p className="text-xs text-ink-muted mt-1">
            {scopeFilter === 'MY'
              ? role === 'faculty'
                ? 'You are not currently assigned as supervisor for any club.'
                : 'You have not been assigned as an organizer for any club yet.'
              : 'Charter the first campus society or club using the button above.'}
          </p>
          {scopeFilter === 'MY' && (
            <button
              onClick={() => setScopeFilter('ALL')}
              className="btn-secondary text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5"
            >
              Browse All Campus Clubs
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayClubs.map((club) => (
            <div
              key={club._id}
              className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle hover:border-brand-accent/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <Badge variant={club.category}>{club.category}</Badge>
                  <div className="flex items-center gap-1.5">
                    {role === 'faculty' && isSupervisedByMe(club) && (
                      <span className="font-mono text-2xs uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Supervised
                      </span>
                    )}
                    {role === 'organizer' && isAssignedToMe(club) && (
                      <span className="font-mono text-2xs uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        My Club
                      </span>
                    )}
                    <span className="font-mono text-2xs text-ink-muted bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
                      {club.eventCount || 0} Events
                    </span>
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg text-ink-primary line-clamp-1">{club.name}</h3>
                <p className="text-xs text-ink-secondary mt-2 line-clamp-3 leading-relaxed font-sans">
                  {club.description}
                </p>

                {club.facultyCoordinator?.name ? (
                  <div className="mt-4 p-3 bg-surface-secondary/60 rounded-lg border border-surface-border text-xs">
                    <p className="font-semibold text-ink-primary flex items-center gap-1.5 text-2xs uppercase tracking-wider font-mono text-brand-accent">
                      <UserCheck className="w-3.5 h-3.5" /> Faculty Mentor:
                    </p>
                    <p className="mt-1 text-ink-primary font-medium">{club.facultyCoordinator.name}</p>
                    <p className="text-2xs text-ink-muted">{club.facultyCoordinator.department || 'Faculty Coordinator'}</p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs">
                    <p className="font-semibold text-amber-900 flex items-center gap-1.5 text-2xs uppercase tracking-wider font-mono">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Faculty Coordinator:
                    </p>
                    <p className="mt-1 text-amber-900 font-medium italic">Unassigned (Admin Review)</p>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-surface-border space-y-2">
                <div className="space-y-1.5 text-xs text-ink-muted">
                  {club.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span className="truncate">{club.contactEmail}</span>
                    </div>
                  )}
                  {club.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                      <span>{club.contactPhone}</span>
                    </div>
                  )}
                </div>

                <Link
                  to={`/manage/club/${club._id}`}
                  className={`text-2xs w-full py-2 flex items-center justify-center gap-1.5 font-semibold mt-3 rounded-lg transition-colors ${
                    canManage(club)
                      ? 'btn-accent text-white'
                      : 'btn-secondary text-ink-primary'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{canManage(club) ? 'Manage Club' : 'View Club Dossier'}</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Charter a Campus Club">
        <form onSubmit={handleCreateClub} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Club Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. ACM Student Chapter"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Charter Purpose & Scope *</label>
            <textarea
              name="description"
              required
              rows={3}
              value={formData.description}
              onChange={handleChange}
              placeholder="Outline the society's objectives, target student body, and planned annual activities..."
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-field text-sm"
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
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                placeholder="society@college.edu"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border">
            <p className="text-xs font-semibold text-ink-primary mb-2">Faculty Advisory</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  name="facultyCoordinatorName"
                  value={formData.facultyCoordinatorName}
                  onChange={handleChange}
                  placeholder="Advisor Full Name"
                  className="input-field text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  name="facultyCoordinatorDept"
                  value={formData.facultyCoordinatorDept}
                  onChange={handleChange}
                  placeholder="Department / School"
                  className="input-field text-xs"
                />
              </div>
            </div>
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
              {submitting ? 'Registering...' : 'Charter Club'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

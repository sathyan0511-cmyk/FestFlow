import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  ShieldCheck,
  UserPlus,
  Building2,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Edit2,
  UserX,
  PlusCircle,
  Briefcase
} from 'lucide-react';

export default function AdminFaculty() {
  const { role } = useAuth();
  const [facultyList, setFacultyList] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create Faculty Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: 'FacultyPassword123!',
    department: 'Computer Science',
    phone: '',
    clubIds: []
  });
  const [creating, setCreating] = useState(false);

  // Edit Faculty Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    department: '',
    phone: '',
    clubIds: []
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchFacultyData = async () => {
    try {
      setLoading(true);
      setError('');
      const [facRes, clubsRes] = await Promise.all([
        api.get('/faculty'),
        api.get('/clubs')
      ]);

      if (facRes.data?.success) {
        setFacultyList(facRes.data.faculty || []);
      }
      if (clubsRes.data?.success) {
        setAllClubs(clubsRes.data.clubs || []);
      }
    } catch (err) {
      console.error('Failed to load faculty records:', err);
      setError(err.response?.data?.message || 'Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const handleCreateFaculty = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError('');
      setActionSuccess('');

      const res = await api.post('/faculty', createForm);
      if (res.data?.success) {
        setActionSuccess(`Faculty account created for ${createForm.name}.`);
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          password: 'FacultyPassword123!',
          department: 'Computer Science',
          phone: '',
          clubIds: []
        });
        await fetchFacultyData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create faculty account.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (fac) => {
    setEditingFaculty(fac);
    const assignedIds = (fac.assignedClubs || []).map((c) => c._id);
    setEditForm({
      name: fac.name || '',
      department: fac.department || '',
      phone: fac.phone || '',
      clubIds: assignedIds
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    try {
      setSavingEdit(true);
      setError('');
      setActionSuccess('');

      const res = await api.put(`/faculty/${editingFaculty._id}`, editForm);
      if (res.data?.success) {
        setActionSuccess(`Updated assignments for ${editingFaculty.name}.`);
        setIsEditModalOpen(false);
        setEditingFaculty(null);
        await fetchFacultyData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update faculty assignments.');
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleClubSelection = (clubId, isCreate = true) => {
    if (isCreate) {
      setCreateForm((prev) => {
        const exists = prev.clubIds.includes(clubId);
        return {
          ...prev,
          clubIds: exists ? prev.clubIds.filter((id) => id !== clubId) : [...prev.clubIds, clubId]
        };
      });
    } else {
      setEditForm((prev) => {
        const exists = prev.clubIds.includes(clubId);
        return {
          ...prev,
          clubIds: exists ? prev.clubIds.filter((id) => id !== clubId) : [...prev.clubIds, clubId]
        };
      });
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving faculty council & university charters..." />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Administrative Control
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Faculty Roster</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Faculty Management
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Provision faculty accounts, assign faculty advisors to campus clubs, or reassign club supervision mandates.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Faculty Account</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2.5 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs font-medium flex items-center gap-2.5 shadow-subtle">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Faculty Accounts Table */}
      <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle space-y-4">
        <h3 className="font-display font-bold text-base text-ink-primary pb-3 border-b border-surface-border">
          Active Faculty Supervisors ({facultyList.length})
        </h3>

        {facultyList.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
            No faculty accounts currently provisioned. Click "Provision Faculty Account" to register a faculty supervisor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary text-ink-muted font-mono text-2xs uppercase border-b border-surface-border">
                <tr>
                  <th className="py-2.5 px-3">Faculty Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Supervised Clubs</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {facultyList.map((fac) => (
                  <tr key={fac._id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-ink-primary">
                      {fac.name}
                      {!fac.isActive && (
                        <span className="ml-2 text-2xs font-mono text-status-error">(Deactivated)</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-ink-secondary">{fac.email}</td>
                    <td className="py-3 px-3 text-ink-secondary">{fac.department || 'Not Specified'}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(fac.assignedClubs || []).length === 0 ? (
                          <span className="text-2xs text-ink-muted italic">No clubs assigned</span>
                        ) : (
                          (fac.assignedClubs || []).map((c) => (
                            <span
                              key={c._id}
                              className="inline-flex items-center gap-1 text-2xs font-mono bg-surface-secondary text-ink-primary px-2 py-0.5 rounded border border-surface-border"
                            >
                              <Building2 className="w-2.5 h-2.5 text-brand-accent" />
                              <span>{c.name}</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(fac)}
                        className="btn-secondary text-2xs px-2.5 py-1 inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit Assignments
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Faculty Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision Faculty Account"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateFaculty} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Faculty Name *
            </label>
            <input
              type="text"
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Prof. Anjali Sharma"
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                University Email *
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="faculty.name@festflow.edu"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Department
              </label>
              <input
                type="text"
                value={createForm.department}
                onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                placeholder="e.g. Electrical Engineering"
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="+91 94440 00000"
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Club Supervision Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Designate Supervised Clubs
            </label>
            <p className="text-2xs text-ink-muted mb-2">
              Select one or more campus clubs that this faculty member will supervise and manage organizers for.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-surface-border rounded-lg p-3 max-h-44 overflow-y-auto">
              {allClubs.map((club) => {
                const isChecked = createForm.clubIds.includes(club._id);
                return (
                  <label
                    key={club._id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-2xs transition-colors ${
                      isChecked ? 'bg-brand-accent/10 border border-brand-accent/30' : 'hover:bg-surface-secondary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleClubSelection(club._id, true)}
                      className="rounded text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="font-semibold text-ink-primary truncate">{club.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="btn-accent text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{creating ? 'Creating Account...' : 'Create Faculty Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Faculty Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingFaculty(null);
        }}
        title={`Edit Assignments: ${editingFaculty?.name || 'Faculty'}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Faculty Name *
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Department
              </label>
              <input
                type="text"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                className="input-field text-sm"
              />
            </div>
          </div>

          {/* Club Supervision Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Supervised Clubs Mandate
            </label>
            <p className="text-2xs text-ink-muted mb-2">
              Toggle the clubs assigned to this faculty member. Checking a club appoints them as faculty coordinator; unchecking revokes supervisor authority.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-surface-border rounded-lg p-3 max-h-48 overflow-y-auto">
              {allClubs.map((club) => {
                const isChecked = editForm.clubIds.includes(club._id);
                return (
                  <label
                    key={club._id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer text-2xs transition-colors ${
                      isChecked ? 'bg-brand-accent/10 border border-brand-accent/30' : 'hover:bg-surface-secondary'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleClubSelection(club._id, false)}
                      className="rounded text-brand-accent focus:ring-brand-accent"
                    />
                    <span className="font-semibold text-ink-primary truncate">{club.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingFaculty(null);
              }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="btn-accent text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{savingEdit ? 'Saving Updates...' : 'Update Mandate'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

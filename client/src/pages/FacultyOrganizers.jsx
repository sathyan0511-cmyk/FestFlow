import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  Users,
  Building2,
  UserCheck,
  UserX,
  Search,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield
} from 'lucide-react';

export default function FacultyOrganizers() {
  const { user, role } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Selected club for organizer assignment
  const [selectedClubId, setSelectedClubId] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Revocation
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetClub, setTargetClub] = useState(null);
  const [studentToRevoke, setStudentToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const fetchSupervisedClubs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/clubs/my-authorized');
      if (res.data?.success && Array.isArray(res.data.clubs)) {
        setClubs(res.data.clubs);
        if (res.data.clubs.length > 0 && !selectedClubId) {
          setSelectedClubId(res.data.clubs[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load supervised clubs:', err);
      setError(err.response?.data?.message || 'Failed to load supervised clubs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisedClubs();
  }, []);

  // Candidate lookup for assignment modal
  useEffect(() => {
    if (!isAssignModalOpen || !selectedClubId) return;
    const timer = setTimeout(async () => {
      try {
        setSearchingCandidates(true);
        const res = await api.get(`/clubs/${selectedClubId}/eligible-students?search=${encodeURIComponent(searchStudent)}`);
        if (res.data?.success) {
          setCandidates(res.data.students || []);
        }
      } catch (err) {
        console.error('Candidate lookup failed:', err);
      } finally {
        setSearchingCandidates(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [selectedClubId, searchStudent, isAssignModalOpen]);

  const handleAssignOrganizer = async () => {
    if (!selectedStudent || !selectedClubId) return;
    try {
      setAssigning(true);
      setError('');
      setActionSuccess('');

      const res = await api.post(`/clubs/${selectedClubId}/organizers`, {
        studentId: selectedStudent._id
      });

      if (res.data?.success) {
        const clubName = clubs.find((c) => c._id === selectedClubId)?.name || 'the club';
        setActionSuccess(`Granted organizer leadership to ${selectedStudent.name} for ${clubName}.`);
        setIsAssignModalOpen(false);
        setSelectedStudent(null);
        setSearchStudent('');
        await fetchSupervisedClubs();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign organizer permissions.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeOrganizer = async () => {
    if (!studentToRevoke || !targetClub) return;
    try {
      setRevoking(true);
      setError('');
      setActionSuccess('');

      const res = await api.delete(`/clubs/${targetClub._id}/organizers/${studentToRevoke._id}`);

      if (res.data?.success) {
        setActionSuccess(`Revoked organizer permissions for ${studentToRevoke.name} from ${targetClub.name}.`);
        setRevokeModalOpen(false);
        setStudentToRevoke(null);
        setTargetClub(null);
        await fetchSupervisedClubs();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke organizer permissions.');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying supervised club rosters & organizers..." />;
  }

  const activeClub = clubs.find((c) => c._id === selectedClubId) || clubs[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Faculty Governance
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Leadership Roll</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Organizer Assignments
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Supervise club leadership appointments. Appoint qualified students as student organizers or revoke permissions when their tenure concludes.
          </p>
        </div>

        {clubs.length > 0 && (
          <button
            onClick={() => {
              setSelectedStudent(null);
              setSearchStudent('');
              setIsAssignModalOpen(true);
            }}
            className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Assign New Organizer</span>
          </button>
        )}
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

      {clubs.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-lg mx-auto">
          <Building2 className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">No Supervised Clubs Assigned</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            You are not currently designated as faculty coordinator for any registered campus clubs. Contact the university administration to establish supervision assignments.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Club Tab Selector */}
          <div className="flex items-center gap-2 border-b border-surface-border pb-3 overflow-x-auto">
            {clubs.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedClubId(c._id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeClub?._id === c._id
                    ? 'bg-ink-primary text-white shadow-subtle'
                    : 'bg-surface-secondary text-ink-secondary hover:text-ink-primary border border-surface-border'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{c.name}</span>
                <span className="text-2xs font-mono opacity-80">({c.organizers?.length || 0})</span>
              </button>
            ))}
          </div>

          {/* Active Club Organizers Panel */}
          {activeClub && (
            <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
                <div>
                  <h3 className="font-display font-bold text-lg text-ink-primary">
                    {activeClub.name} — Current Organizers
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {activeClub.organizers?.length || 0} student(s) currently possess event management authority for this club.
                  </p>
                </div>

                <Link
                  to={`/manage/club/${activeClub._id}`}
                  className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Open Full Club Dossier</span>
                </Link>
              </div>

              {activeClub.organizers?.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
                  No organizers currently assigned to {activeClub.name}. Click "Assign New Organizer" to promote a student member.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary text-ink-muted font-mono text-2xs uppercase border-b border-surface-border">
                      <tr>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Email Address</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Register No.</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {activeClub.organizers?.map((org) => (
                        <tr key={org._id} className="hover:bg-surface-secondary/40 transition-colors">
                          <td className="py-3 px-3 font-semibold text-ink-primary">{org.name}</td>
                          <td className="py-3 px-3 text-ink-secondary">{org.email}</td>
                          <td className="py-3 px-3 text-ink-secondary">{org.department || 'Not Specified'}</td>
                          <td className="py-3 px-3 font-mono text-2xs">{org.registerNumber || '—'}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-2xs font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Shield className="w-3 h-3 text-emerald-600" /> Active Organizer
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                setStudentToRevoke(org);
                                setTargetClub(activeClub);
                                setRevokeModalOpen(true);
                              }}
                              className="text-status-error hover:bg-rose-50 border border-surface-border px-2.5 py-1 rounded text-2xs font-semibold transition-colors inline-flex items-center gap-1"
                            >
                              <UserX className="w-3 h-3" /> Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedStudent(null);
        }}
        title="Appoint Student Organizer"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Target Supervised Club *
            </label>
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="input-field text-sm"
            >
              {clubs.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Search Student Directory *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Search by student name, register number, or email..."
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>

          {/* Candidates List */}
          <div className="border border-surface-border rounded-lg max-h-56 overflow-y-auto divide-y divide-surface-border">
            {searchingCandidates ? (
              <div className="p-4 text-center text-ink-muted font-mono text-2xs">
                Searching candidate students...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 text-center text-ink-muted text-2xs">
                {searchStudent ? 'No matching students found.' : 'Type a query to search existing student records.'}
              </div>
            ) : (
              candidates.map((cand) => {
                const isSelected = selectedStudent?._id === cand._id;
                return (
                  <div
                    key={cand._id}
                    onClick={() => {
                      if (!cand.isOrganizerForThisClub) setSelectedStudent(cand);
                    }}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      cand.isOrganizerForThisClub
                        ? 'opacity-50 cursor-not-allowed bg-surface-secondary/40'
                        : isSelected
                        ? 'bg-brand-accent/10 border-l-2 border-brand-accent'
                        : 'hover:bg-surface-secondary/60'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-ink-primary text-xs">{cand.name}</p>
                      <p className="text-2xs text-ink-muted">
                        {cand.email} • {cand.department || 'Student'} {cand.registerNumber ? `(#${cand.registerNumber})` : ''}
                      </p>
                    </div>

                    <div>
                      {cand.isOrganizerForThisClub ? (
                        <span className="text-2xs font-mono text-ink-muted">Active Organizer</span>
                      ) : (
                        <button
                          type="button"
                          className={`text-2xs px-2.5 py-1 rounded font-semibold ${
                            isSelected
                              ? 'bg-brand-accent text-white'
                              : 'border border-surface-border hover:bg-surface-border text-ink-secondary'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {selectedStudent && (
            <div className="p-3 bg-brand-accent/5 border border-brand-accent/20 rounded-lg text-2xs space-y-1">
              <p className="font-semibold text-ink-primary">
                Appointing: <strong className="text-brand-accent">{selectedStudent.name}</strong>
              </p>
              <p className="text-ink-muted">
                Will be granted organizer authority strictly for <strong>{clubs.find((c) => c._id === selectedClubId)?.name}</strong>.
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedStudent(null);
              }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedStudent || assigning}
              onClick={handleAssignOrganizer}
              className="btn-accent text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{assigning ? 'Assigning...' : 'Confirm Appointment'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={revokeModalOpen}
        onClose={() => {
          setRevokeModalOpen(false);
          setStudentToRevoke(null);
          setTargetClub(null);
        }}
        title="Revoke Organizer Status"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 text-status-error rounded-lg flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Revoke leadership appointment?</p>
              <p className="text-rose-700 text-2xs mt-1 leading-relaxed">
                <strong>{studentToRevoke?.name}</strong> will lose organizer authority for <strong>{targetClub?.name}</strong>. Their student account, event passes, and any roles in other clubs remain completely preserved.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRevokeModalOpen(false);
                setStudentToRevoke(null);
                setTargetClub(null);
              }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={revoking}
              onClick={handleRevokeOrganizer}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <UserX className="w-3.5 h-3.5" />
              <span>{revoking ? 'Revoking...' : 'Confirm Revocation'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  Building2,
  Calendar,
  Users,
  UserCheck,
  UserX,
  PlusCircle,
  Search,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';

export default function ClubManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [club, setClub] = useState(null);
  const [events, setEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('overview');

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const fetchClubData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [clubRes, membersRes] = await Promise.all([
        api.get(`/clubs/${id}`),
        api.get(`/memberships/club/${id}`).catch(() => ({ data: { members: [] } }))
      ]);

      if (clubRes.data?.success) {
        setClub(clubRes.data.club);
        setEvents(clubRes.data.events || []);
        setUpcomingEvents(clubRes.data.upcomingEvents || []);
        setPastEvents(clubRes.data.pastEvents || []);
      }

      if (membersRes.data?.success) {
        setMembers(membersRes.data.members || []);
      }
    } catch (err) {
      console.error('Failed to load club dossier:', err);
      setError(err.response?.data?.message || 'Failed to load club details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  // Debounced lookup for eligible student candidates
  useEffect(() => {
    if (!isAssignModalOpen) return;
    const delayDebounce = setTimeout(async () => {
      try {
        setSearchingCandidates(true);
        const res = await api.get(`/clubs/${id}/eligible-students?search=${encodeURIComponent(searchStudent)}`);
        if (res.data?.success) {
          setCandidates(res.data.students || []);
        }
      } catch (err) {
        console.error('Candidate lookup failed:', err);
      } finally {
        setSearchingCandidates(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [id, searchStudent, isAssignModalOpen]);

  const handleAssignOrganizer = async () => {
    if (!selectedStudent) return;
    try {
      setAssigning(true);
      setError('');
      setActionSuccess('');

      const res = await api.post(`/clubs/${id}/organizers`, {
        studentId: selectedStudent._id
      });

      if (res.data?.success) {
        setActionSuccess(`Granted organizer leadership permissions to ${selectedStudent.name}.`);
        setIsAssignModalOpen(false);
        setSelectedStudent(null);
        setSearchStudent('');
        await fetchClubData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign organizer permissions.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeOrganizer = async () => {
    if (!studentToRevoke) return;
    try {
      setRevoking(true);
      setError('');
      setActionSuccess('');

      const res = await api.delete(`/clubs/${id}/organizers/${studentToRevoke._id}`);

      if (res.data?.success) {
        setActionSuccess(`Revoked organizer permissions for ${studentToRevoke.name}.`);
        setRevokeModalOpen(false);
        setStudentToRevoke(null);
        await fetchClubData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke organizer permissions.');
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving club council dossier..." />;
  }

  if (error && !club) {
    return (
      <div className="bg-surface-primary border border-surface-border rounded-xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-status-error mx-auto mb-3" />
        <h3 className="font-display font-bold text-xl text-ink-primary">Club Inaccessible</h3>
        <p className="text-sm text-ink-muted mt-1">{error}</p>
        <Link to="/clubs" className="btn-accent text-xs px-4 py-2 mt-6 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Return to Campus Clubs
        </Link>
      </div>
    );
  }

  const isSupervisor = role === 'admin' || (role === 'faculty' && (
    (user?.supervisedClubs || []).includes(club?._id) ||
    club?.facultyCoordinator?.user?._id === user?.id ||
    club?.facultyCoordinator?.email === user?.email
  ));

  const isClubOrganizer = role === 'admin' || (role === 'organizer' && (
    club?.organizers?.some((o) => (o._id || o).toString() === (user?._id || user?.id)?.toString()) ||
    (user?.authorizedClubs || []).includes(club?._id)
  ));

  const canManageOrganizers = role === 'admin' || isSupervisor;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-wider text-ink-muted bg-surface-secondary px-2.5 py-1 rounded border border-surface-border">
            Managing Context: <strong className="text-ink-primary font-bold">{club.name}</strong>
          </span>
          {isSupervisor && (
            <span className="font-mono text-2xs uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Supervising Faculty
            </span>
          )}
        </div>
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

      <div className="bg-surface-primary rounded-xl border border-surface-border p-6 sm:p-8 shadow-subtle">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="w-14 h-14 rounded-xl bg-surface-secondary border border-surface-border flex items-center justify-center font-display font-bold text-2xl text-brand-accent shrink-0 shadow-subtle">
              {club.name?.charAt(0) || 'C'}
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant={club.category}>{club.category}</Badge>
                <Badge variant={club.status}>{club.status}</Badge>
                <span className="text-2xs font-mono text-ink-muted">
                  Est. {new Date(club.establishmentDate || club.createdAt).getFullYear()}
                </span>
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-ink-primary tracking-tight">
                {club.name}
              </h1>
              <p className="text-xs text-ink-muted mt-1.5 max-w-2xl leading-relaxed">
                {club.description}
              </p>
            </div>
          </div>

          {(role === 'admin' || isClubOrganizer) && (
            <Link
              to="/events/create"
              className="btn-accent text-xs px-4 py-2 inline-flex items-center gap-2 shrink-0 self-start"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Schedule Event</span>
            </Link>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-surface-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-surface-secondary/70 border border-surface-border/60">
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-muted">Faculty Coordinator</p>
            <p className="font-semibold text-ink-primary mt-1">
              {club.facultyCoordinator?.name || <span className="text-amber-700 italic">Unassigned (Admin Review)</span>}
            </p>
            {club.facultyCoordinator?.email && (
              <p className="text-2xs text-ink-muted mt-0.5">{club.facultyCoordinator.email}</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-surface-secondary/70 border border-surface-border/60">
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-muted">Active Organizers</p>
            <p className="font-semibold text-ink-primary font-mono text-base mt-0.5">
              {club.organizers?.length || 0}
            </p>
            <p className="text-2xs text-ink-muted mt-0.5">Authorized event leadership</p>
          </div>

          <div className="p-3 rounded-lg bg-surface-secondary/70 border border-surface-border/60">
            <p className="font-mono text-2xs uppercase tracking-wider text-ink-muted">Registered Members</p>
            <p className="font-semibold text-ink-primary font-mono text-base mt-0.5">
              {members.length}
            </p>
            <p className="text-2xs text-ink-muted mt-0.5">Enrolled student society body</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-b border-surface-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'bg-ink-primary text-white shadow-subtle'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-secondary'
          }`}
        >
          Overview & Events ({events.length})
        </button>

        <button
          onClick={() => setActiveTab('organizers')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'organizers'
              ? 'bg-ink-primary text-white shadow-subtle'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-secondary'
          }`}
        >
          Organizers ({club.organizers?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'members'
              ? 'bg-ink-primary text-white shadow-subtle'
              : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-secondary'
          }`}
        >
          Student Members ({members.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-ink-primary">
                Upcoming Events ({upcomingEvents.length})
              </h3>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-8 text-center">
                <Calendar className="w-8 h-8 text-ink-muted/50 mx-auto mb-2" />
                <p className="text-xs text-ink-muted">No upcoming events currently scheduled for {club.name}.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className="bg-surface-primary border border-surface-border rounded-xl p-4 shadow-subtle hover:border-brand-accent/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={ev.eventType}>{ev.eventType}</Badge>
                        <Badge variant={ev.status}>{ev.status}</Badge>
                      </div>
                      <h4 className="font-display font-bold text-sm text-ink-primary">{ev.title}</h4>
                      <p className="text-2xs text-ink-muted line-clamp-2 mt-1">{ev.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-surface-border text-2xs space-y-1 text-ink-secondary">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-brand-accent" />
                        <span>{new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                        <span>{ev.venue?.name || 'Campus Venue'}</span>
                      </div>
                      <Link
                        to={`/events/${ev._id}`}
                        className="btn-secondary text-2xs w-full py-1 mt-2 inline-flex items-center justify-center gap-1"
                      >
                        View Dossier <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-surface-border">
              <h3 className="font-display font-bold text-base text-ink-primary">
                Past Events Archive ({pastEvents.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pastEvents.map((ev) => (
                  <div
                    key={ev._id}
                    className="bg-surface-primary/70 border border-surface-border rounded-xl p-4 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="completed">Concluded</Badge>
                      <span className="text-2xs font-mono text-ink-muted">
                        {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-ink-primary mt-1">{ev.title}</h4>
                    <Link
                      to={`/events/${ev._id}`}
                      className="text-2xs font-semibold text-brand-accent hover:underline mt-2 inline-block"
                    >
                      Inspect Historical Records →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'organizers' && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
            <div>
              <h3 className="font-display font-bold text-base text-ink-primary">
                Chartered Club Organizers ({club.organizers?.length || 0})
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Students designated with administrative authority to schedule events, manage attendees, and run operations.
              </p>
            </div>

            {canManageOrganizers && (
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setSearchStudent('');
                  setIsAssignModalOpen(true);
                }}
                className="btn-accent text-xs px-3.5 py-2 inline-flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Assign New Organizer</span>
              </button>
            )}
          </div>

          {club.organizers?.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
              No organizers currently assigned to this club.
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
                    {canManageOrganizers && <th className="py-2.5 px-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {club.organizers?.map((org) => (
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
                      {canManageOrganizers && (
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => {
                              setStudentToRevoke(org);
                              setRevokeModalOpen(true);
                            }}
                            className="text-status-error hover:bg-rose-50 border border-surface-border px-2.5 py-1 rounded text-2xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <UserX className="w-3 h-3" /> Revoke
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
            <div>
              <h3 className="font-display font-bold text-base text-ink-primary">
                Club Membership Roll ({members.length})
              </h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Students who have joined or applied to this society.
              </p>
            </div>

            {canManageOrganizers && (
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setSearchStudent('');
                  setIsAssignModalOpen(true);
                }}
                className="btn-accent text-xs px-3.5 py-2 inline-flex items-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Promote Member to Organizer</span>
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
              No registered student members found for this club yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-secondary text-ink-muted font-mono text-2xs uppercase border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Membership Role</th>
                    <th className="py-2.5 px-3">Join Date</th>
                    {canManageOrganizers && <th className="py-2.5 px-3 text-right">Promote</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {members.map((m) => {
                    const isAlreadyOrg = club.organizers?.some((o) => (o._id || o).toString() === m.user?._id?.toString());
                    return (
                      <tr key={m._id} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-ink-primary">{m.user?.name}</td>
                        <td className="py-3 px-3 text-ink-secondary">{m.user?.email}</td>
                        <td className="py-3 px-3 text-ink-secondary">{m.user?.department || '—'}</td>
                        <td className="py-3 px-3">
                          <Badge variant={m.role}>{m.role}</Badge>
                        </td>
                        <td className="py-3 px-3 text-2xs font-mono text-ink-muted">
                          {new Date(m.joinedDate || m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        {canManageOrganizers && (
                          <td className="py-3 px-3 text-right">
                            {isAlreadyOrg ? (
                              <span className="text-2xs font-mono text-ink-muted">Organizer</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedStudent(m.user);
                                  setIsAssignModalOpen(true);
                                }}
                                className="btn-accent text-2xs px-2.5 py-1"
                              >
                                Promote
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedStudent(null);
        }}
        title={`Assign Organizer for ${club.name}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <p className="text-ink-muted">
            Search an existing student to appoint them as a student organizer for <strong>{club.name}</strong>. They will gain event creation and management rights strictly for this club.
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search by student name, register number, or college email..."
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="border border-surface-border rounded-lg max-h-60 overflow-y-auto divide-y divide-surface-border">
            {searchingCandidates ? (
              <div className="p-4 text-center text-ink-muted font-mono text-2xs">
                Scanning student directory...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 text-center text-ink-muted text-2xs">
                {searchStudent ? 'No matching students found.' : 'Type a name or email to look up eligible students.'}
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
                        <span className="text-2xs font-mono text-ink-muted">Already Organizer</span>
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
                Confirm Appointing: <strong className="text-brand-accent">{selectedStudent.name}</strong>
              </p>
              <p className="text-ink-muted">
                This student will immediately receive event management permissions for {club.name}.
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
              <span>{assigning ? 'Assigning...' : 'Confirm Organizer Appointment'}</span>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={revokeModalOpen}
        onClose={() => {
          setRevokeModalOpen(false);
          setStudentToRevoke(null);
        }}
        title="Revoke Organizer Status"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 text-status-error rounded-lg flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">Are you sure you want to revoke this appointment?</p>
              <p className="text-rose-700 text-2xs mt-1 leading-relaxed">
                <strong>{studentToRevoke?.name}</strong> ({studentToRevoke?.email}) will no longer be able to create, edit, or manage events for <strong>{club.name}</strong>. Their student account, event passes, and permissions in other clubs will remain untouched.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRevokeModalOpen(false);
                setStudentToRevoke(null);
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
              <span>{revoking ? 'Revoking...' : 'Revoke Permissions'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

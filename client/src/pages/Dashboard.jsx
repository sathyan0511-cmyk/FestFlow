import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import StatCard from '../components/StatCard';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import {
  Calendar,
  Building2,
  MapPin,
  Ticket,
  Users,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass
} from 'lucide-react';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [selectedClubFilter, setSelectedClubFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registeringId, setRegisteringId] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/events?upcoming=true')
      ]);

      if (statsRes.data?.success) {
        setStats(statsRes.data.stats);
      }

      if (eventsRes.data?.success) {
        setUpcomingEvents(eventsRes.data.events || []);
      }

      // Fetch authorized clubs for organizer or faculty
      if (role === 'organizer' || role === 'faculty') {
        const clubsRes = await api.get('/clubs/my-authorized').catch(() => ({ data: {} }));
        if (clubsRes.data?.success && Array.isArray(clubsRes.data.clubs)) {
          setMyClubs(clubsRes.data.clubs);
        }
      }

      // Track registered event IDs for quick status lookup
      if (role === 'student' || role === 'organizer' || role === 'faculty') {
        const myRegRes = await api.get('/registrations/my').catch(() => ({ data: {} }));
        if (myRegRes.data?.success && Array.isArray(myRegRes.data.registrations)) {
          const registeredIds = new Set(
            myRegRes.data.registrations
              .filter((r) => r.registrationStatus !== 'cancelled')
              .map((r) => (r.event?._id || r.event)?.toString())
          );
          setRegisteredEventIds(registeredIds);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const handleQuickRegister = async (eventId) => {
    try {
      setRegisteringId(eventId);
      setActionSuccess('');
      setError('');
      const res = await api.post('/registrations', { eventId });
      if (res.data?.success) {
        setActionSuccess(`Registration confirmed! Ticket #${res.data.registration.ticketNumber}`);
        setRegisteredEventIds((prev) => new Set([...prev, eventId]));
        fetchDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration.');
    } finally {
      setRegisteringId(null);
    }
  };

  const displayedEvents = React.useMemo(() => {
    if (role === 'organizer') {
      const myClubIdSet = new Set(myClubs.map((c) => c._id.toString()));
      return upcomingEvents.filter((ev) => {
        const evClubId = (ev.club?._id || ev.club)?.toString();
        if (selectedClubFilter !== 'ALL') {
          return evClubId === selectedClubFilter;
        }
        return myClubIdSet.has(evClubId);
      });
    }
    if (role === 'faculty') {
      const supervisedIdSet = new Set(myClubs.map((c) => c._id.toString()));
      return upcomingEvents.filter((ev) => {
        const evClubId = (ev.club?._id || ev.club)?.toString();
        if (selectedClubFilter !== 'ALL') {
          return evClubId === selectedClubFilter;
        }
        return supervisedIdSet.has(evClubId);
      });
    }
    return upcomingEvents;
  }, [upcomingEvents, role, myClubs, selectedClubFilter]);

  if (loading) {
    return <LoadingSpinner message="Assembling campus pulse & schedules..." />;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-surface-primary border border-surface-border rounded-xl p-6 sm:p-8 shadow-subtle relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-accent" />

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pl-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
                Campus Portal • Active Term
              </span>
              <span className="text-surface-border">•</span>
              <span className="text-2xs font-mono text-ink-muted">
                {role === 'admin'
                  ? 'Administrative Overseer'
                  : role === 'faculty'
                  ? 'Faculty Advisor Console'
                  : role === 'organizer'
                  ? 'Club Organizer Console'
                  : 'Student Pass'}
              </span>
            </div>

            <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Scholar'}.
            </h1>

            <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
              {role === 'student'
                ? 'Discover upcoming campus hackathons, technical symposiums, and cultural festivals. Reserve your admission passes directly.'
                : role === 'faculty'
                ? 'Supervise club activities, review student membership, and assign organizer leadership across your designated campus clubs.'
                : 'Coordinate college festival operations, monitor student admissions, and manage events for your chartered student societies.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {role === 'faculty' && (
              <Link to="/faculty/organizers" className="btn-accent text-xs px-3.5 py-2.5 inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Organizer Assignments</span>
              </Link>
            )}
            {role === 'admin' && (
              <Link to="/admin/faculty" className="btn-secondary text-xs px-3.5 py-2.5 inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Manage Faculty</span>
              </Link>
            )}
            {role === 'organizer' && (
              <Link to="/my-registrations" className="btn-secondary text-xs px-3.5 py-2.5 inline-flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>My Event Passes</span>
              </Link>
            )}
            {(role === 'admin' || role === 'organizer') && (
              <Link to="/events/create" className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Host New Event</span>
              </Link>
            )}
            {role === 'student' && (
              <Link to="/my-registrations" className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>My Event Passes</span>
              </Link>
            )}

            <Link to="/events" className="btn-secondary text-xs px-4 py-2.5 inline-flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>Browse Calendar</span>
            </Link>
          </div>
        </div>
      </div>

      {(role === 'organizer' || role === 'faculty') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-surface-border">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
                  {role === 'faculty' ? 'Faculty Jurisdiction' : 'Chartered Societies'}
                </span>
                <span className="text-surface-border">•</span>
                <span className="text-2xs font-mono text-ink-muted">
                  {role === 'faculty' ? 'Supervised Clubs' : 'Active Appointments'}
                </span>
              </div>
              <h2 className="font-display font-bold text-2xl text-ink-primary">
                My Clubs
              </h2>
            </div>

            {myClubs.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-secondary">Focus Club:</span>
                <select
                  value={selectedClubFilter}
                  onChange={(e) => setSelectedClubFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium bg-surface-primary border border-surface-border rounded-lg shadow-subtle focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="ALL">All My Clubs ({myClubs.length})</option>
                  {myClubs.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {myClubs.length === 0 ? (
            <div className="bg-surface-primary rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-8 text-center max-w-xl mx-auto my-4">
              <Building2 className="w-10 h-10 text-amber-600/70 mx-auto mb-3" />
              <h3 className="font-display font-bold text-base text-amber-900">No Club Assignments</h3>
              <p className="text-xs text-amber-800 mt-1.5 leading-relaxed">
                {role === 'organizer'
                  ? 'You are not currently assigned as an organizer to any club. Please contact your faculty coordinator.'
                  : 'You are not currently designated as the faculty coordinator for any registered clubs. Please contact a campus administrator.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myClubs
                .filter((c) => selectedClubFilter === 'ALL' || c._id === selectedClubFilter)
                .map((club) => {
                  return (
                    <div
                      key={club._id}
                      className="bg-surface-primary border border-surface-border rounded-xl p-5 shadow-subtle hover:border-brand-accent/50 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="w-10 h-10 rounded-lg bg-surface-secondary border border-surface-border flex items-center justify-center text-brand-accent font-display font-bold text-base shrink-0">
                            {club.name?.charAt(0) || 'C'}
                          </span>
                          <Badge variant={club.category || 'Technical'}>{club.category || 'Club'}</Badge>
                        </div>

                        <h3 className="font-display font-bold text-base text-ink-primary line-clamp-1">
                          {club.name}
                        </h3>

                        <p className="text-xs text-ink-muted line-clamp-2 mt-1 leading-relaxed">
                          {club.description || 'Active campus student society.'}
                        </p>

                        <div className="mt-4 pt-3 border-t border-surface-border/60 text-2xs space-y-1.5 text-ink-secondary">
                          <div className="flex items-center justify-between">
                            <span className="text-ink-muted">Faculty Coordinator:</span>
                            <span className="font-semibold text-ink-primary truncate max-w-[150px]">
                              {club.facultyCoordinator?.name || 'Unassigned'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-muted">Active Organizers:</span>
                            <span className="font-mono font-bold text-ink-primary">
                              {club.organizersCount ?? club.organizers?.length ?? 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-ink-muted">Upcoming Events:</span>
                            <span className="font-mono font-bold text-brand-accent">
                              {club.upcomingEventsCount ?? 0}
                            </span>
                          </div>
                          {role === 'faculty' && (
                            <div className="flex items-center justify-between">
                              <span className="text-ink-muted">Enrolled Members:</span>
                              <span className="font-mono font-bold text-ink-primary">
                                {club.membersCount ?? 0}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-surface-border flex items-center gap-2">
                        <Link
                          to={`/manage/club/${club._id}`}
                          className="btn-accent text-xs px-3 py-1.5 w-full flex items-center justify-center gap-1.5"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{role === 'faculty' ? 'Manage Club' : 'Open Club Console'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="All Scheduled Events"
          value={stats?.totalEvents ?? 0}
          subtitle={`${stats?.upcomingEventsCount ?? 0} active / upcoming`}
          icon={Calendar}
        />
        <StatCard
          title="Campus Clubs"
          value={stats?.totalClubs ?? 0}
          subtitle="Registered student societies"
          icon={Building2}
        />
        <StatCard
          title="Campus Venues"
          value={stats?.totalVenues ?? 0}
          subtitle="Auditoriums & lab facilities"
          icon={MapPin}
        />
        {role === 'student' ? (
          <StatCard
            title="My Confirmed Passes"
            value={stats?.userStats?.myActiveRegistrations ?? 0}
            subtitle="Valid entry reservations"
            icon={Ticket}
          />
        ) : role === 'organizer' ? (
          <StatCard
            title="My Club Events"
            value={stats?.userStats?.myEventsCount ?? displayedEvents.length}
            subtitle={`Across ${stats?.userStats?.myClubsCount ?? myClubs.length} authorized club(s)`}
            icon={Calendar}
          />
        ) : role === 'faculty' ? (
          <StatCard
            title="Supervised Clubs"
            value={stats?.userStats?.myClubsCount ?? myClubs.length}
            subtitle={`Advising ${stats?.userStats?.myOrganizersCount ?? 0} organizers`}
            icon={Building2}
          />
        ) : (
          <StatCard
            title="Total Registrations"
            value={stats?.totalRegistrations ?? 0}
            subtitle={`Enrolled across ${stats?.totalStudents ?? 0} students`}
            icon={Users}
          />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-end justify-between pb-2 border-b border-surface-border">
          <div>
            <h2 className="font-display font-bold text-2xl text-ink-primary">
              {role === 'organizer'
                ? selectedClubFilter === 'ALL'
                  ? 'My Clubs Scheduled Events'
                  : `${myClubs.find((c) => c._id === selectedClubFilter)?.name || 'Club'} Events`
                : role === 'faculty'
                ? selectedClubFilter === 'ALL'
                  ? 'Supervised Club Events'
                  : `${myClubs.find((c) => c._id === selectedClubFilter)?.name || 'Club'} Events`
                : 'Upcoming Campus Events'}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {role === 'organizer'
                ? 'Festivals, hackathons, and workshops scheduled for your authorized student societies'
                : role === 'faculty'
                ? 'Events scheduled by student societies under your faculty supervision'
                : 'Live festivals, hackathons, and workshops currently open for attendee enrollment'}
            </p>
          </div>
          <Link
            to={role === 'organizer' ? '/events?filter=my-clubs' : '/events'}
            className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1 group"
          >
            <span>Explore All ({displayedEvents.length})</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {displayedEvents.length === 0 ? (
          <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center">
            <Calendar className="w-10 h-10 text-ink-muted/50 mx-auto mb-3" />
            <h3 className="font-display font-bold text-base text-ink-primary">No Scheduled Events</h3>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              {role === 'organizer'
                ? 'No upcoming events are currently scheduled for your authorized club(s). Host your first festival!'
                : role === 'faculty'
                ? 'No upcoming events are currently scheduled by your supervised clubs.'
                : 'There are currently no upcoming events on the university roster. Check back soon!'}
            </p>
            {role !== 'student' && role !== 'faculty' && myClubs.length > 0 && (
              <Link to="/events/create" className="btn-accent text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" /> Create First Event
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedEvents.slice(0, 6).map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onQuickRegister={['student', 'organizer', 'faculty'].includes(role) ? handleQuickRegister : null}
                isRegistering={registeringId === event._id}
                isUserRegistered={registeredEventIds.has(event._id)}
              />
            ))}
          </div>
        )}
      </div>

      {stats?.recentRegistrations && stats.recentRegistrations.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-surface-secondary text-brand-accent flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink-primary">Recent Registrations Roster</h3>
                <p className="text-2xs text-ink-muted">Live event passes issued across departments</p>
              </div>
            </div>
            <span className="font-mono text-2xs uppercase tracking-wider text-ink-muted bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-surface-border">
            {stats.recentRegistrations.map((reg) => (
              <div key={reg._id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-secondary border border-surface-border text-ink-primary flex items-center justify-center font-bold text-xs">
                    {reg.user?.name ? reg.user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-primary">{reg.user?.name || 'Participant'}</p>
                    <p className="text-2xs text-ink-muted">{reg.user?.department || 'Department Not Specified'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-ink-primary truncate max-w-xs">{reg.event?.title || 'Event'}</p>
                  <span className="text-2xs font-mono text-ink-muted">
                    {new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

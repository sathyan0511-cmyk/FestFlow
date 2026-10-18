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
  Sparkles,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export default function Dashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
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

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      if (eventsRes.data.success) {
        setUpcomingEvents(eventsRes.data.events);
      }

      // If student, also get their registration list to know which events they're already in
      if (role === 'student') {
        const myRegRes = await api.get('/registrations/my');
        if (myRegRes.data.success) {
          const registeredIds = new Set(
            myRegRes.data.registrations
              .filter((r) => r.registrationStatus !== 'cancelled')
              .map((r) => r.event?._id)
          );
          setRegisteredEventIds(registeredIds);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
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
      if (res.data.success) {
        setActionSuccess(`Registered successfully! Ticket #${res.data.registration.ticketNumber}`);
        setRegisteredEventIds((prev) => new Set([...prev, eventId]));
        fetchDashboardData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register.');
    } finally {
      setRegisteringId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading FestFlow Dashboard..." />;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 text-white p-6 sm:p-8 shadow-lg shadow-indigo-500/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Welcome Back
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user?.name || 'FestFlow Explorer'}! 👋
            </h1>
            <p className="text-sm text-indigo-100 mt-1.5 max-w-xl">
              {role === 'student'
                ? 'Discover upcoming campus hackathons, cultural fests, workshops, and manage your tickets.'
                : 'Manage college events, coordinate club schedules, and track student participant registrations.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {role === 'student' ? (
              <Link
                to="/my-registrations"
                className="px-4 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" /> My Event Passes
              </Link>
            ) : (
              <Link
                to="/events/create"
                className="px-4 py-2.5 bg-white text-indigo-700 text-sm font-bold rounded-xl shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Host New Event
              </Link>
            )}
          </div>
        </div>

        {/* Ambient background circles */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm shadow-sm">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Events"
          value={stats?.totalEvents ?? 0}
          subtitle={`${stats?.upcomingEventsCount ?? 0} currently active / upcoming`}
          icon={Calendar}
          color="indigo"
        />
        <StatCard
          title="Campus Clubs"
          value={stats?.totalClubs ?? 0}
          subtitle="Technical, cultural & sports"
          icon={Building2}
          color="emerald"
        />
        <StatCard
          title="Venues & Auditoriums"
          value={stats?.totalVenues ?? 0}
          subtitle="Halls, labs & open grounds"
          icon={MapPin}
          color="amber"
        />
        {role === 'student' ? (
          <StatCard
            title="My Registrations"
            value={stats?.userStats?.myActiveRegistrations ?? 0}
            subtitle="Confirmed event entries"
            icon={Ticket}
            color="rose"
          />
        ) : (
          <StatCard
            title="Total Registrations"
            value={stats?.totalRegistrations ?? 0}
            subtitle={`Across ${stats?.totalStudents ?? 0} students`}
            icon={Users}
            color="purple"
          />
        )}
      </div>

      {/* Featured Upcoming Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upcoming Events</h2>
            <p className="text-xs text-slate-500">Live campus activities open for registration</p>
          </div>
          <Link
            to="/events"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Explore All ({upcomingEvents.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-700">No upcoming events found</h3>
            <p className="text-xs text-slate-500 mt-1">Check back soon or create the first event!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.slice(0, 3).map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onQuickRegister={role === 'student' ? handleQuickRegister : null}
                isRegistering={registeringId === event._id}
                isUserRegistered={registeredEventIds.has(event._id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extra Section: Recent registrations / quick overview */}
      {stats?.recentRegistrations && stats.recentRegistrations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Registrations Activity</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">Realtime database feed</span>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.recentRegistrations.map((reg) => (
              <div key={reg._id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {reg.user?.name ? reg.user.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{reg.user?.name || 'Participant'}</p>
                    <p className="text-[11px] text-slate-500">{reg.user?.department || 'Student'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700 truncate max-w-xs">{reg.event?.title}</p>
                  <span className="text-[10px] text-slate-400">
                    {new Date(reg.createdAt).toLocaleDateString()}
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

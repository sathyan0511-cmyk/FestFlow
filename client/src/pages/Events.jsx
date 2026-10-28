import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, PlusCircle, CalendarX, Sparkles, Filter, CheckCircle2, Building2, Globe } from 'lucide-react';

export default function Events() {
  const { role, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const clubFilter = searchParams.get('filter'); // 'my-clubs'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [registeringId, setRegisteringId] = useState(null);
  const [registeredEventIds, setRegisteredEventIds] = useState(new Set());
  const [message, setMessage] = useState('');

  const eventTypes = ['All', 'Technical', 'Cultural', 'Sports', 'Workshop', 'Competition', 'Seminar'];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (selectedType && selectedType !== 'All') query.push(`eventType=${encodeURIComponent(selectedType)}`);

      const queryString = query.length > 0 ? `?${query.join('&')}` : '';
      const res = await api.get(`/events${queryString}`);
      if (res.data?.success) {
        setEvents(res.data.events || []);
      }

      if (role === 'student' || role === 'organizer') {
        const myRegRes = await api.get('/registrations/my');
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
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedType, role]);

  const handleQuickRegister = async (eventId) => {
    try {
      setRegisteringId(eventId);
      setMessage('');
      const res = await api.post('/registrations', { eventId });
      if (res.data?.success) {
        setMessage(`Admission pass issued! Ticket #${res.data.registration.ticketNumber}`);
        setRegisteredEventIds((prev) => new Set([...prev, eventId]));
        fetchEvents();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegisteringId(null);
    }
  };

  const displayedEvents = React.useMemo(() => {
    if (clubFilter === 'my-clubs') {
      const authClubIds = new Set(
        (user?.authorizedClubs || user?.supervisedClubs || []).map((c) => (c?._id || c)?.toString())
      );
      return events.filter((ev) => authClubIds.has((ev.club?._id || ev.club)?.toString()));
    }
    return events;
  }, [events, clubFilter, user]);

  const canCreate = role === 'admin' || role === 'organizer';

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              University Roster
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">
              {clubFilter === 'my-clubs' ? 'My Authorized Societies' : 'Discovery & Admissions'}
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            {clubFilter === 'my-clubs' ? 'My Club Events' : 'Events & Festivals'}
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            {clubFilter === 'my-clubs'
              ? 'Festivals, hackathons, and workshops scheduled strictly by the clubs you manage or supervise.'
              : 'Explore academic symposia, hackathons, and cultural evenings across campus. Reserve your attendance pass in one click.'}
          </p>
        </div>

        {canCreate && (
          <Link
            to="/events/create"
            className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start md:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Host New Event</span>
          </Link>
        )}
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2.5 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="space-y-3">
        {(role === 'organizer' || role === 'faculty') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete('filter');
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                clubFilter !== 'my-clubs'
                  ? 'bg-ink-primary text-white shadow-subtle'
                  : 'bg-surface-secondary text-ink-secondary hover:text-ink-primary border border-surface-border'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>All Campus Events</span>
            </button>
            <button
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('filter', 'my-clubs');
                setSearchParams(params);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                clubFilter === 'my-clubs'
                  ? 'bg-ink-primary text-white shadow-subtle'
                  : 'bg-surface-secondary text-ink-secondary hover:text-ink-primary border border-surface-border'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>My Club Events Only</span>
            </button>
          </div>
        )}

        <div className="bg-surface-primary rounded-xl border border-surface-border p-4 shadow-subtle flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search festivals, workshops, or clubs..."
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {eventTypes.map((type) => {
              const isSelected = selectedType === type || (!selectedType && type === 'All');
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type === 'All' ? '' : type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-ink-primary text-white shadow-subtle'
                      : 'bg-surface-secondary text-ink-secondary hover:bg-surface-border border border-surface-border'
                  }`}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner message="Scanning university calendar..." />
      ) : displayedEvents.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-lg mx-auto">
          <CalendarX className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">No Events Found</h3>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
            {clubFilter === 'my-clubs'
              ? 'No events currently scheduled for your authorized clubs.'
              : 'No events matched your current filters. Try searching for a different keyword or category.'}
          </p>
          {(search || selectedType || clubFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('');
                const params = new URLSearchParams(searchParams);
                params.delete('filter');
                setSearchParams(params);
              }}
              className="btn-secondary text-xs px-4 py-2 mt-4 inline-block"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedEvents.map((event) => (
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
  );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import EventCard from '../components/EventCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, Filter, PlusCircle, CalendarX } from 'lucide-react';

export default function Events() {
  const { role } = useAuth();
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
      if (res.data.success) {
        setEvents(res.data.events);
      }

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
      if (res.data.success) {
        setMessage(`Successfully registered! Ticket #${res.data.registration.ticketNumber}`);
        setRegisteredEventIds((prev) => new Set([...prev, eventId]));
        fetchEvents();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegisteringId(null);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campus Events & Fests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Discover, register, and manage college competitions, seminars, and performances
          </p>
        </div>

        {canCreate && (
          <Link
            to="/events/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Event</span>
          </Link>
        )}
      </div>

      {message && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-xl text-xs">
          {message}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, clubs, or topics..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>

        {/* Event Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {eventTypes.map((type) => {
            const isSelected = selectedType === type || (!selectedType && type === 'All');
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type === 'All' ? '' : type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <LoadingSpinner message="Searching events..." />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <CalendarX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No events matched your filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search term or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
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
  );
}

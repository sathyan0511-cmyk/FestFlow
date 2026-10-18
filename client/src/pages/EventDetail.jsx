import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  Award,
  ArrowLeft,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Trash2,
  UserCheck,
  Star,
  Briefcase,
  Utensils,
  Trophy,
  HeartHandshake,
  CreditCard
} from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-data
  const [attendees, setAttendees] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [myRegistration, setMyRegistration] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  // Additional modules data
  const [competitions, setCompetitions] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [sponsorships, setSponsorships] = useState([]);
  const [catering, setCatering] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [payments, setPayments] = useState([]);

  // Feedback form
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  // Payment state
  const [paying, setPaying] = useState(false);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${id}`);
      if (res.data.success) {
        setEvent(res.data.event);
      }

      // Check registration
      const regRes = await api.get('/registrations/my');
      if (regRes.data.success) {
        const match = regRes.data.registrations.find(
          (r) => r.event?._id === id && r.registrationStatus !== 'cancelled'
        );
        if (match) {
          setIsRegistered(true);
          setMyRegistration(match);
        } else {
          setIsRegistered(false);
          setMyRegistration(null);
        }
      }

      // Load sub-modules in parallel
      const [compRes, fbRes, sponRes, catRes, volRes] = await Promise.all([
        api.get(`/competitions/event/${id}`).catch(() => ({ data: {} })),
        api.get(`/feedback/event/${id}`).catch(() => ({ data: {} })),
        api.get(`/sponsors/event/${id}`).catch(() => ({ data: {} })),
        api.get(`/catering/event/${id}`).catch(() => ({ data: {} })),
        api.get(`/volunteers/event/${id}`).catch(() => ({ data: {} }))
      ]);

      if (compRes.data?.success) setCompetitions(compRes.data.competitions);
      if (fbRes.data?.success) {
        setFeedbacks(fbRes.data.feedbacks);
        setAvgRating(fbRes.data.avgRating);
      }
      if (sponRes.data?.success) setSponsorships(sponRes.data.sponsorships);
      if (catRes.data?.success) setCatering(catRes.data.catering);
      if (volRes.data?.success) setVolunteers(volRes.data.volunteers);

      if (role === 'admin' || role === 'organizer') {
        const attRes = await api.get(`/registrations/event/${id}`).catch(() => ({ data: {} }));
        if (attRes.data?.success) setAttendees(attRes.data.registrations);

        const payRes = await api.get(`/payments/event/${id}`).catch(() => ({ data: {} }));
        if (payRes.data?.success) setPayments(payRes.data.payments);
      }
    } catch (err) {
      console.error(err);
      setError('Event not found or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id, role]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      setActionMessage('');
      setError('');
      const res = await api.post('/registrations', { eventId: id });
      if (res.data.success) {
        setIsRegistered(true);
        setMyRegistration(res.data.registration);
        setActionMessage('Registration confirmed! Your e-ticket has been generated.');
        fetchEventData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handlePay = async () => {
    if (!myRegistration) return;
    try {
      setPaying(true);
      const res = await api.post('/payments', {
        registrationId: myRegistration._id,
        paymentMethod: 'upi'
      });
      if (res.data.success) {
        alert('Payment verified & receipt generated!');
        fetchEventData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/feedback', {
        eventId: id,
        rating: myRating,
        comments: myComment
      });
      if (res.data.success) {
        setFeedbackSuccess('Feedback submitted! Thank you for reviewing.');
        setMyComment('');
        fetchEventData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This will also remove any registrations.')) return;
    try {
      const res = await api.delete(`/events/${id}`);
      if (res.data.success) {
        navigate('/events');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  if (loading) return <LoadingSpinner message="Loading comprehensive event profile..." />;
  if (error || !event) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Event Not Found</h3>
        <Link to="/events" className="mt-4 inline-block text-xs font-semibold text-indigo-600">
          ← Back to Events List
        </Link>
      </div>
    );
  }

  const startDate = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const deadline = new Date(event.registrationDeadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const canManage = role === 'admin' || (role === 'organizer' && (event.createdBy?._id === user?.id || event.organizers?.some((o) => o._id === user?.id)));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'competitions', label: `Competitions (${competitions.length})` },
    { id: 'feedback', label: `Reviews & Ratings (${feedbacks.length})` },
    { id: 'sponsors', label: `Sponsors (${sponsorships.length})` },
    { id: 'catering', label: `Catering & Menu (${catering.length})` },
    { id: 'volunteers', label: `Volunteers (${volunteers.length})` },
    ...(canManage ? [{ id: 'attendees', label: `Attendees (${attendees.length})` }] : [])
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Events
        </Link>

        {canManage && (
          <button
            onClick={handleDeleteEvent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete Event
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant={event.eventType}>{event.eventType}</Badge>
          <span className="text-xs font-medium px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full">
            {event.category}
          </span>
          <Badge variant={event.status}>{event.status}</Badge>
          {avgRating > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {avgRating} / 5
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {event.title}
        </h1>

        {event.chiefGuest && (
          <div className="mt-2.5 flex items-center gap-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl w-fit">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Chief Guest: {event.chiefGuest}</span>
          </div>
        )}

        {/* Date / Time / Venue bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-100 py-3.5 text-xs text-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{startDate}</p>
              <p className="text-slate-500">{event.startTime} - {event.endTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{event.venue?.name}</p>
              <p className="text-slate-500">{event.venue?.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{event.club?.name}</p>
              <p className="text-slate-500">{event.club?.category} Club</p>
            </div>
          </div>
        </div>

        {/* Registration Section */}
        <div className="mt-5 p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>{event.registeredCount || 0} / {event.maxParticipants} Seats Filled</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Deadline: <span className="font-medium text-slate-700">{deadline}</span> • Fee: <span className="font-bold text-indigo-600">{event.registrationFee > 0 ? `₹${event.registrationFee}` : 'Free'}</span>
            </p>
          </div>

          {role === 'student' ? (
            isRegistered ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed #{myRegistration?.ticketNumber}
                </span>
                {event.registrationFee > 0 && (
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    {paying ? 'Verifying...' : 'Pay Fee (₹' + event.registrationFee + ')'}
                  </button>
                )}
              </div>
            ) : event.isFull ? (
              <span className="px-3.5 py-1.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-xl border border-rose-200">
                Event Full
              </span>
            ) : event.isRegistrationClosed ? (
              <span className="px-3.5 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl">
                Deadline Expired
              </span>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {registering ? 'Registering...' : 'Register For Pass'}
              </button>
            )
          ) : (
            <span className="text-xs text-slate-500 font-medium">Logged in as {role}</span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Event Overview</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{event.description}</p>

          {/* Venue Facilities */}
          {event.venue?.facilities && event.venue.facilities.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Venue Facilities</h4>
              <div className="flex flex-wrap gap-2">
                {event.venue.facilities.map((f, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg">
                    ✓ {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Competitions */}
      {activeTab === 'competitions' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Event Competitions</h3>
            <Link to="/competitions" className="text-xs font-bold text-indigo-600 hover:underline">
              Open Full Leaderboard →
            </Link>
          </div>

          {competitions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No competitions scheduled under this event yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitions.map((comp) => (
                <div key={comp._id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <Badge variant={comp.competitionType}>{comp.competitionType}</Badge>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{comp.competitionName}</h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{comp.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Feedback & Reviews */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Submit Review */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Leave Attendee Feedback</h3>

            {feedbackSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setMyRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-5 h-5 ${star <= myRating ? 'fill-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Share your thoughts on speakers, organization, and venues..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />

              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm">
                Submit Review
              </button>
            </form>
          </div>

          {/* Feedback List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Attendee Reviews ({feedbacks.length})</h3>
            {feedbacks.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No reviews submitted yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {feedbacks.map((fb) => (
                  <div key={fb._id} className="py-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{fb.user?.name || 'Student'}</span>
                      <div className="flex text-amber-400">
                        {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                      </div>
                    </div>
                    {fb.comments && <p className="text-slate-600 leading-relaxed">{fb.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Sponsors */}
      {activeTab === 'sponsors' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Event Sponsors</h3>
            <Link to="/sponsors" className="text-xs font-bold text-indigo-600 hover:underline">
              Manage All Sponsors →
            </Link>
          </div>

          {sponsorships.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No corporate sponsors confirmed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sponsorships.map((s) => (
                <div key={s._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {s.sponsorshipType} Tier
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{s.sponsor?.name}</h4>
                  <p className="text-emerald-600 font-extrabold mt-1">₹{s.sponsorshipAmount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Catering */}
      {activeTab === 'catering' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Catering & Menu Details</h3>
            <Link to="/catering" className="text-xs font-bold text-indigo-600 hover:underline">
              Open Catering Hub →
            </Link>
          </div>

          {catering.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No catering scheduled for this event.</p>
          ) : (
            catering.map((c) => (
              <div key={c._id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 mb-3">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{c.catererName}</span>
                  <span className="text-indigo-600">Total: ₹{(c.totalCost || 0).toLocaleString()}</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {c.menu?.map((m, i) => (
                    <div key={i} className="py-1 flex justify-between text-slate-600">
                      <span>{m.menuItem} (×{m.quantity})</span>
                      <span>₹{m.costPerUnit * m.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 6: Volunteers */}
      {activeTab === 'volunteers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Volunteer Crew</h3>
            <Link to="/volunteering" className="text-xs font-bold text-indigo-600 hover:underline">
              Apply to Volunteer →
            </Link>
          </div>

          {volunteers.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No volunteers assigned to this event yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {volunteers.map((v) => (
                <div key={v._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{v.user?.name}</span>
                    <span className="text-slate-500 ml-2">({v.assignedTask})</span>
                  </div>
                  <Badge variant={v.volunteerStatus}>{v.volunteerStatus}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Attendees (Admin / Organizer) */}
      {canManage && activeTab === 'attendees' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Attendee Registrations ({attendees.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Ticket ID</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendees.map((att) => (
                  <tr key={att._id}>
                    <td className="py-2 px-3 font-semibold text-slate-900">{att.user?.name}</td>
                    <td className="py-2 px-3">{att.user?.email}</td>
                    <td className="py-2 px-3 font-mono font-medium text-indigo-600">{att.ticketNumber}</td>
                    <td className="py-2 px-3">
                      <Badge variant={att.registrationStatus}>{att.registrationStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

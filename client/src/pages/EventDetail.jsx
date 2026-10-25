import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
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
  Star,
  CreditCard,
  ExternalLink,
  ChevronRight,
  Edit3
} from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

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
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Payment state
  const [paying, setPaying] = useState(false);

  // Edit Event Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editVenues, setEditVenues] = useState([]);
  const [editClubs, setEditClubs] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/events/${id}`);
      if (res.data?.success) {
        const eventData = res.data.event;
        setEvent(eventData);

        const userClubIds = (user?.authorizedClubs || []).map((c) => (c?._id || c)?.toString());
        const eventClubId = (eventData?.club?._id || eventData?.club)?.toString();
        const isAuthorized =
          role === 'admin' ||
          (role === 'organizer' &&
            (userClubIds.includes(eventClubId) ||
              eventData?.organizers?.some((o) => (o?._id || o)?.toString() === (user?._id || user?.id)?.toString())));

        if (isAuthorized) {
          const [attRes, payRes] = await Promise.all([
            api.get(`/registrations/event/${id}`).catch(() => ({ data: {} })),
            api.get(`/payments/event/${id}`).catch(() => ({ data: {} }))
          ]);
          if (attRes.data?.success) setAttendees(attRes.data.registrations || []);
          if (payRes.data?.success) setPayments(payRes.data.payments || []);
        } else {
          setAttendees([]);
          setPayments([]);
        }
      }

      // Check registration
      const regRes = await api.get('/registrations/my').catch(() => ({ data: {} }));
      if (regRes.data?.success && Array.isArray(regRes.data.registrations)) {
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

      if (compRes.data?.success) setCompetitions(compRes.data.competitions || []);
      if (fbRes.data?.success) {
        setFeedbacks(fbRes.data.feedbacks || []);
        setAvgRating(fbRes.data.avgRating || 0);
      }
      if (sponRes.data?.success) setSponsorships(sponRes.data.sponsorships || []);
      if (catRes.data?.success) setCatering(catRes.data.catering || []);
      if (volRes.data?.success) setVolunteers(volRes.data.volunteers || []);
    } catch (err) {
      console.error(err);
      setError('Event profile not found or server inaccessible.');
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
      if (res.data?.success) {
        setIsRegistered(true);
        setMyRegistration(res.data.registration);
        setActionMessage('Admission confirmed! Your digital festival ticket has been issued.');
        fetchEventData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration.');
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
      if (res.data?.success) {
        alert('Payment verified and e-receipt issued!');
        fetchEventData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment processing failed');
    } finally {
      setPaying(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingFeedback(true);
      const res = await api.post('/feedback', {
        eventId: id,
        rating: myRating,
        comments: myComment
      });
      if (res.data?.success) {
        setFeedbackSuccess('Thank you! Your attendee review has been published.');
        setMyComment('');
        fetchEventData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleOpenEditModal = async () => {
    if (!event) return;
    setEditError('');
    setEditFormData({
      title: event.title || '',
      description: event.description || '',
      eventType: event.eventType || 'Technical',
      category: event.category || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
      startTime: event.startTime || '10:00',
      endTime: event.endTime || '16:00',
      venue: event.venue?._id || event.venue || '',
      club: event.club?._id || event.club || '',
      maxParticipants: event.maxParticipants || 100,
      registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().split('T')[0] : '',
      registrationFee: event.registrationFee || 0,
      chiefGuest: event.chiefGuest || '',
      status: event.status || 'published'
    });

    try {
      const [venuesRes, clubsRes] = await Promise.all([
        api.get('/venues'),
        role === 'admin' ? api.get('/clubs') : api.get('/clubs/my-authorized')
      ]);
      if (venuesRes.data?.success) setEditVenues(venuesRes.data.venues || []);
      if (clubsRes.data?.success) setEditClubs(clubsRes.data.clubs || []);
    } catch (err) {
      console.error('Failed to load options for edit modal:', err);
    }

    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      setSavingEdit(true);
      const res = await api.put(`/events/${id}`, editFormData);
      if (res.data?.success) {
        setIsEditModalOpen(false);
        setActionMessage('Event specifications updated successfully.');
        await fetchEventData();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      const res = await api.delete(`/events/${id}`);
      if (res.data?.success) {
        navigate('/events');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving event dossiers & schedules..." />;
  }

  if (error || !event) {
    return (
      <div className="bg-surface-primary border border-surface-border rounded-xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-status-error mx-auto mb-3" />
        <h3 className="font-display font-bold text-xl text-ink-primary">Event Not Found</h3>
        <p className="text-sm text-ink-muted mt-1">{error || 'This event may have been removed or rescheduled.'}</p>
        <Link to="/events" className="btn-accent text-xs px-4 py-2 mt-6 inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Return to Campus Roster
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

  const userClubIds = (user?.authorizedClubs || []).map((c) => (c?._id || c)?.toString());
  const eventClubId = (event?.club?._id || event?.club)?.toString();
  const canManage =
    role === 'admin' ||
    (role === 'organizer' &&
      (userClubIds.includes(eventClubId) ||
        event?.organizers?.some((o) => (o?._id || o)?.toString() === (user?._id || user?.id)?.toString())));

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'competitions', label: `Competitions (${competitions.length})` },
    { id: 'feedback', label: `Reviews (${feedbacks.length})` },
    { id: 'sponsors', label: `Sponsors (${sponsorships.length})` },
    { id: 'catering', label: `Catering (${catering.length})` },
    { id: 'volunteers', label: `Volunteers (${volunteers.length})` },
    ...(canManage ? [{ id: 'attendees', label: `Attendees (${attendees.length})` }] : [])
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Top Breadcrumb & Administrative Actions */}
      <div className="flex items-center justify-between">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to All Events
        </Link>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEditModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-brand-accent hover:bg-surface-secondary border border-surface-border rounded-lg text-xs font-semibold transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Event
            </button>
            <button
              onClick={handleDeleteEvent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-status-error hover:bg-rose-50 border border-surface-border rounded-lg text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Event
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Main Masthead Card */}
      <div className="bg-surface-primary rounded-xl border border-surface-border p-6 sm:p-8 shadow-subtle">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant={event.eventType}>{event.eventType}</Badge>
          <span className="text-2xs font-mono uppercase bg-surface-secondary text-ink-secondary px-2 py-0.5 rounded border border-surface-border">
            {event.category}
          </span>
          <Badge variant={event.status}>{event.status}</Badge>
          {avgRating > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {avgRating.toFixed(1)} / 5.0
            </span>
          )}
        </div>

        <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
          {event.title}
        </h1>

        {event.chiefGuest && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-primary bg-surface-secondary border border-surface-border px-3 py-1.5 rounded-lg w-fit">
            <Award className="w-4 h-4 text-brand-accent shrink-0" />
            <span>Distinguished Chief Guest: <strong className="font-semibold">{event.chiefGuest}</strong></span>
          </div>
        )}

        {/* Date, Time, Venue, Club Roster */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-surface-border py-4 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-surface-secondary text-brand-accent">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-ink-primary">{startDate}</p>
              <p className="text-ink-muted text-2xs mt-0.5">{event.startTime} - {event.endTime}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-surface-secondary text-brand-accent">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-ink-primary">{event.venue?.name || 'TBA'}</p>
              <p className="text-ink-muted text-2xs mt-0.5">{event.venue?.location || 'Campus Location'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-surface-secondary text-brand-accent">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-ink-primary">{event.club?.name || 'College Society'}</p>
              <p className="text-ink-muted text-2xs mt-0.5">{event.club?.category || 'Student'} Club</p>
            </div>
          </div>
        </div>

        {/* Admission & Reservation Action Bar */}
        <div className="mt-6 p-4 sm:p-5 bg-surface-secondary/60 rounded-xl border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
              <Users className="w-4 h-4 text-brand-accent" />
              <span>{event.registeredCount || 0} of {event.maxParticipants} Admissions Claimed</span>
            </div>
            <p className="text-2xs text-ink-muted mt-1">
              Registration deadline: <span className="font-semibold text-ink-primary">{deadline}</span> • Entry Fee: <span className="font-mono font-bold text-ink-primary">{event.registrationFee > 0 ? `₹${formatINR(event.registrationFee)}` : 'Complimentary'}</span>
            </p>
          </div>

          {['student', 'organizer'].includes(role) ? (
            isRegistered ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-semibold text-status-success bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pass #{myRegistration?.ticketNumber}
                </span>
                {event.registrationFee > 0 && (
                  <button
                    onClick={handlePay}
                    disabled={paying}
                    className="btn-accent text-xs px-3.5 py-1.5 flex items-center gap-1 disabled:opacity-50"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{paying ? 'Verifying...' : `Pay ₹${formatINR(event.registrationFee)}`}</span>
                  </button>
                )}
              </div>
            ) : event.isFull ? (
              <span className="px-3 py-1.5 bg-rose-50 text-status-error text-xs font-mono font-semibold rounded-lg border border-rose-200">
                Full Capacity Reached
              </span>
            ) : event.isRegistrationClosed ? (
              <span className="px-3 py-1.5 bg-surface-secondary text-ink-muted text-xs font-mono font-medium rounded-lg border border-surface-border">
                Admissions Closed
              </span>
            ) : (
              <button
                onClick={handleRegister}
                disabled={registering}
                className="btn-accent text-xs px-5 py-2.5 font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Ticket className="w-4 h-4" />
                <span>{registering ? 'Claiming Pass...' : 'Claim Admission Pass'}</span>
              </button>
            )
          ) : (
            <span className="text-xs font-mono text-ink-muted">Logged in as {role}</span>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-surface-border pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-ink-primary text-white shadow-subtle'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-secondary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 sm:p-8 space-y-6 shadow-subtle">
          <div>
            <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted mb-2 font-semibold">
              Festival Description & Scope
            </h3>
            <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line font-sans">
              {event.description}
            </p>
          </div>

          {/* Venue Facilities */}
          {event.venue?.facilities && event.venue.facilities.length > 0 && (
            <div className="pt-6 border-t border-surface-border">
              <h4 className="font-mono text-2xs uppercase tracking-widest text-ink-muted mb-3 font-semibold">
                Venue Amenities & Facilities
              </h4>
              <div className="flex flex-wrap gap-2">
                {event.venue.facilities.map((f, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 bg-surface-secondary text-ink-secondary border border-surface-border rounded-md"
                  >
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
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <h3 className="font-display font-bold text-base text-ink-primary">Event Contests & Challenges</h3>
            <Link to="/competitions" className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1">
              <span>View Full Leaderboards</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {competitions.length === 0 ? (
            <p className="text-xs text-ink-muted py-8 text-center">No competitions scheduled under this festival yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competitions.map((comp) => (
                <div key={comp._id} className="p-4 rounded-xl border border-surface-border bg-surface-secondary/40 space-y-1">
                  <Badge variant={comp.competitionType}>{comp.competitionType}</Badge>
                  <h4 className="font-display font-bold text-sm text-ink-primary mt-2">{comp.competitionName}</h4>
                  <p className="text-xs text-ink-muted line-clamp-2">{comp.description}</p>
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
          <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
            <h3 className="font-display font-bold text-base text-ink-primary mb-3">Leave Attendee Review</h3>

            {feedbackSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 text-status-success rounded-lg text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-ink-secondary">Rating:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setMyRating(star)}
                      className="p-1 focus:outline-none hover:scale-110 transition-transform"
                    >
                      <Star className={`w-5 h-5 ${star <= myRating ? 'fill-amber-400 text-amber-500' : 'text-surface-border'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                rows={3}
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                placeholder="Share your experience on speakers, logistics, venue facilities, and organization..."
                className="input-field text-xs"
              />

              <button
                type="submit"
                disabled={submittingFeedback}
                className="btn-accent text-xs px-4 py-2 disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting...' : 'Post Review'}
              </button>
            </form>
          </div>

          {/* Feedback List */}
          <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
            <h3 className="font-display font-bold text-base text-ink-primary mb-4 pb-3 border-b border-surface-border">
              Attendee Reviews ({feedbacks.length})
            </h3>
            {feedbacks.length === 0 ? (
              <p className="text-xs text-ink-muted py-6 text-center">No reviews submitted yet. Be the first to review!</p>
            ) : (
              <div className="divide-y divide-surface-border">
                {feedbacks.map((fb) => (
                  <div key={fb._id} className="py-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink-primary">{fb.user?.name || 'Verified Scholar'}</span>
                      <div className="flex text-amber-500 font-mono text-xs">
                        {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                      </div>
                    </div>
                    {fb.comments && <p className="text-ink-secondary leading-relaxed">{fb.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Sponsors */}
      {activeTab === 'sponsors' && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <h3 className="font-display font-bold text-base text-ink-primary">Corporate Partners & Sponsors</h3>
            <Link to="/sponsors" className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1">
              <span>View All Sponsors</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {sponsorships.length === 0 ? (
            <p className="text-xs text-ink-muted py-8 text-center">No corporate sponsors confirmed for this event yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sponsorships.map((s) => (
                <div key={s._id} className="p-4 rounded-xl border border-surface-border bg-surface-secondary/40 text-xs">
                  <span className="font-mono text-2xs uppercase font-bold text-brand-accent bg-surface-primary px-2 py-0.5 rounded border border-surface-border">
                    {s.sponsorshipType} Tier
                  </span>
                  <h4 className="font-display font-bold text-ink-primary text-sm mt-2">{s.sponsor?.name}</h4>
                  <p className="font-mono font-bold text-status-success mt-1">₹{formatINR(s.sponsorshipAmount)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Catering */}
      {activeTab === 'catering' && (
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <h3 className="font-display font-bold text-base text-ink-primary">Catering & Menu Details</h3>
            <Link to="/catering" className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1">
              <span>Catering Directory</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {catering.length === 0 ? (
            <p className="text-xs text-ink-muted py-8 text-center">No catering provisions logged for this festival.</p>
          ) : (
            catering.map((c) => (
              <div key={c._id} className="p-4 rounded-xl bg-surface-secondary/40 border border-surface-border text-xs space-y-2 mb-3">
                <div className="flex justify-between font-bold text-ink-primary">
                  <span>{c.catererName}</span>
                  <span className="font-mono text-brand-accent">Total: ₹{formatINR(c.totalCost || 0)}</span>
                </div>
                <div className="divide-y divide-surface-border">
                  {c.menu?.map((m, i) => (
                    <div key={i} className="py-1.5 flex justify-between text-ink-secondary">
                      <span>{m.menuItem} (×{m.quantity})</span>
                      <span className="font-mono">₹{formatINR(m.costPerUnit * m.quantity)}</span>
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
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <h3 className="font-display font-bold text-base text-ink-primary">Volunteer Operations Corps</h3>
            <Link to="/volunteering" className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1">
              <span>Volunteer Roster</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {volunteers.length === 0 ? (
            <p className="text-xs text-ink-muted py-8 text-center">No volunteers currently deployed for this event.</p>
          ) : (
            <div className="divide-y divide-surface-border">
              {volunteers.map((v) => (
                <div key={v._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink-primary">{v.user?.name}</span>
                    <span className="text-ink-muted ml-2 font-mono text-2xs">({v.assignedTask})</span>
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
        <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
          <h3 className="font-display font-bold text-base text-ink-primary mb-3 pb-3 border-b border-surface-border">
            Confirmed Attendees Roster ({attendees.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary text-ink-muted font-mono text-2xs uppercase border-b border-surface-border">
                <tr>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">Email Address</th>
                  <th className="py-2 px-3">Ticket ID</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {attendees.map((att) => (
                  <tr key={att._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-ink-primary">{att.user?.name}</td>
                    <td className="py-2.5 px-3 text-ink-secondary">{att.user?.email}</td>
                    <td className="py-2.5 px-3 font-mono font-medium text-brand-accent">#{att.ticketNumber}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant={att.registrationStatus}>{att.registrationStatus}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Event Dossier"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={editFormData.title || ''}
              onChange={handleEditChange}
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={3}
              value={editFormData.description || ''}
              onChange={handleEditChange}
              className="input-field text-sm font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Event Type *
              </label>
              <select
                name="eventType"
                value={editFormData.eventType || 'Technical'}
                onChange={handleEditChange}
                className="input-field text-sm"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Competition">Competition</option>
                <option value="Fest">Fest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Sub-Category
              </label>
              <input
                type="text"
                name="category"
                value={editFormData.category || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Campus Venue Facility *
              </label>
              <select
                name="venue"
                required
                value={editFormData.venue || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              >
                {editVenues.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} (Cap: {v.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Publication Status *
              </label>
              <select
                name="status"
                value={editFormData.status || 'published'}
                onChange={handleEditChange}
                className="input-field text-sm"
              >
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                required
                value={editFormData.startDate || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                required
                value={editFormData.endDate || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={editFormData.startTime || '10:00'}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={editFormData.endTime || '16:00'}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Max Capacity *
              </label>
              <input
                type="number"
                name="maxParticipants"
                min="1"
                required
                value={editFormData.maxParticipants || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Entry Fee (₹)
              </label>
              <input
                type="number"
                name="registrationFee"
                min="0"
                value={editFormData.registrationFee || 0}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Deadline *
              </label>
              <input
                type="date"
                name="registrationDeadline"
                required
                value={editFormData.registrationDeadline || ''}
                onChange={handleEditChange}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Chief Guest / Speaker
            </label>
            <input
              type="text"
              name="chiefGuest"
              value={editFormData.chiefGuest || ''}
              onChange={handleEditChange}
              placeholder="e.g. Dr. A. P. Sharma"
              className="input-field text-sm"
            />
          </div>

          <div className="pt-4 border-t border-surface-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="btn-accent text-xs px-4 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{savingEdit ? 'Saving Updates...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

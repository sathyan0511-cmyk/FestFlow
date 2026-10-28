import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import {
  Trophy,
  Users,
  Award,
  PlusCircle,
  CheckCircle2,
  Calendar,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

export default function Competitions() {
  const { role, user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  const [compDetails, setCompDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [submittingTeam, setSubmittingTeam] = useState(false);
  const [submittingComp, setSubmittingComp] = useState(false);

  const [compForm, setCompForm] = useState({
    eventId: '',
    competitionName: '',
    description: '',
    competitionType: 'hackathon',
    maximumTeams: 20,
    teamSizeLimit: 4,
    rules: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const eventsRes = await api.get('/events');
      if (eventsRes.data?.success && Array.isArray(eventsRes.data.events) && eventsRes.data.events.length > 0) {
        setEvents(eventsRes.data.events);
        setCompForm((prev) => ({ ...prev, eventId: eventsRes.data.events[0]._id }));

        // Fetch competitions for all events
        const compPromises = eventsRes.data.events.map((e) =>
          api.get(`/competitions/event/${e._id}`).catch(() => ({ data: {} }))
        );
        const compResults = await Promise.all(compPromises);
        const allComps = compResults.flatMap((r) => (r.data?.success ? r.data.competitions : []));
        setCompetitions(allComps);

        if (allComps.length > 0) {
          loadCompDetails(allComps[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching competitions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompDetails = async (compId) => {
    if (!compId) return;
    try {
      setDetailsLoading(true);
      setSelectedComp(compId);
      const res = await api.get(`/competitions/${compId}`);
      if (res.data?.success) {
        setCompDetails(res.data);
      }
    } catch (err) {
      console.error('Error loading competition details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    try {
      setSubmittingTeam(true);
      const res = await api.post('/competitions/teams', {
        competitionId: selectedComp,
        teamName
      });
      if (res.data?.success) {
        setIsTeamModalOpen(false);
        setTeamName('');
        setActionMsg(`Squad "${res.data.team?.teamName}" enrolled successfully!`);
        loadCompDetails(selectedComp);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to enroll squad.');
    } finally {
      setSubmittingTeam(false);
    }
  };

  const handleCreateComp = async (e) => {
    e.preventDefault();
    try {
      setSubmittingComp(true);
      const res = await api.post('/competitions', compForm);
      if (res.data?.success) {
        setIsCompModalOpen(false);
        setCompForm({
          eventId: events[0]?._id || '',
          competitionName: '',
          description: '',
          competitionType: 'hackathon',
          maximumTeams: 20,
          teamSizeLimit: 4,
          rules: ''
        });
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create competition.');
    } finally {
      setSubmittingComp(false);
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  if (loading) {
    return <LoadingSpinner message="Loading university hackathons & tournaments..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Tournament Arena
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Competitive & Judging Console</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Competitions & Hackathons
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Register teams for coding challenges, track real-time jury scoring, and view official prize winners.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCompModalOpen(true)}
            className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Competition</span>
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-status-success rounded-lg text-xs font-medium flex items-center gap-2 shadow-subtle">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {competitions.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
          <Trophy className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-ink-primary">No Competitions Found</h3>
          <p className="text-xs text-ink-muted mt-1">
            There are currently no active competitions scheduled under campus festivals.
          </p>
          {canCreate && (
            <button
              onClick={() => setIsCompModalOpen(true)}
              className="btn-accent text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Create First Contest
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-bold">
              Available Contests ({competitions.length})
            </h3>
            <div className="space-y-2">
              {competitions.map((comp) => {
                const isSelected = selectedComp === comp._id;
                return (
                  <div
                    key={comp._id}
                    onClick={() => loadCompDetails(comp._id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-surface-primary border-brand-accent shadow-subtle ring-1 ring-brand-accent/20'
                        : 'bg-surface-primary border-surface-border hover:border-ink-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant={comp.competitionType}>{comp.competitionType}</Badge>
                      <span className="text-2xs font-mono text-ink-muted">
                        Max {comp.maximumTeams} Squads
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-ink-primary">{comp.competitionName}</h4>
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1">{comp.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            {detailsLoading || !compDetails ? (
              <LoadingSpinner message="Reconciling tournament standings..." />
            ) : (
              <>
                <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant={compDetails.competition?.competitionType}>
                          {compDetails.competition?.competitionType}
                        </Badge>
                        <span className="text-2xs font-mono text-ink-muted">
                          Squad Size: Up to {compDetails.competition?.teamSizeLimit} scholars
                        </span>
                      </div>
                      <h2 className="font-display font-bold text-2xl text-ink-primary">
                        {compDetails.competition?.competitionName}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsTeamModalOpen(true)}
                      className="btn-accent text-xs px-4 py-2 inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Register Team</span>
                    </button>
                  </div>

                  <p className="text-xs text-ink-secondary mt-4 leading-relaxed font-sans">
                    {compDetails.competition?.description}
                  </p>

                  {compDetails.competition?.rules && (
                    <div className="mt-4 p-3 bg-surface-secondary/70 rounded-lg border border-surface-border text-xs text-ink-secondary flex items-start gap-2.5">
                      <FileText className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-ink-primary">Official Regulations:</span>
                        <p className="mt-0.5 text-2xs text-ink-muted leading-relaxed">
                          {compDetails.competition.rules}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {compDetails.prizes && compDetails.prizes.length > 0 && (
                  <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-border">
                      <Trophy className="w-4 h-4 text-brand-accent" />
                      <h3 className="font-display font-bold text-base text-ink-primary">Prizes & Podium Awards</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {compDetails.prizes.map((p) => (
                        <div key={p._id} className="bg-surface-secondary/60 p-3.5 rounded-lg border border-surface-border">
                          <span className="font-mono text-2xs uppercase font-bold px-2 py-0.5 rounded bg-surface-primary text-brand-accent border border-surface-border">
                            Rank #{p.position}
                          </span>
                          <h4 className="font-display font-bold text-xs text-ink-primary mt-2">{p.prizeName}</h4>
                          <p className="font-mono font-bold text-sm text-status-success mt-0.5">₹{formatINR(p.amount)}</p>
                        </div>
                      ))}
                    </div>

                    {compDetails.results && compDetails.results.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-surface-border">
                        <p className="text-xs font-semibold text-ink-primary mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-accent" /> Official Declared Champions:
                        </p>
                        <div className="space-y-2">
                          {compDetails.results.map((r) => (
                            <div key={r._id} className="bg-surface-secondary/40 px-4 py-2.5 rounded-lg border border-surface-border flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold text-xs font-mono">
                                  {r.position}
                                </span>
                                <div>
                                  <p className="font-bold text-ink-primary">{r.team?.teamName || 'Winner Squad'}</p>
                                  <span className="text-2xs font-mono text-ink-muted">Final Score: {r.finalScore} / 100</span>
                                </div>
                              </div>
                              <span className="font-mono font-semibold text-brand-accent">{r.prize?.prizeName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
                    <h3 className="font-display font-bold text-base text-ink-primary flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-accent" />
                      Enrolled Squads ({compDetails.teams?.length || 0})
                    </h3>
                  </div>

                  {compDetails.teams?.length === 0 ? (
                    <p className="text-xs text-ink-muted text-center py-4">No squads enrolled yet.</p>
                  ) : (
                    <div className="divide-y divide-surface-border">
                      {compDetails.teams.map((t) => (
                        <div key={t._id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-ink-primary">{t.teamName}</span>
                            <span className="text-ink-muted ml-2 font-mono text-2xs">• Captain: {t.teamLeader?.name}</span>
                          </div>
                          <Badge variant={t.teamStatus === 'winner' ? 'published' : 'draft'}>
                            {t.teamStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle">
                    <h4 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold mb-3">
                      Scoring Rubric & Criteria
                    </h4>
                    <div className="space-y-2">
                      {compDetails.criteria?.map((c) => (
                        <div key={c._id} className="p-2.5 rounded-lg bg-surface-secondary/50 border border-surface-border text-xs">
                          <div className="flex justify-between font-semibold text-ink-primary">
                            <span>{c.criteriaName}</span>
                            <span className="font-mono text-2xs">{c.maximumScore} pts</span>
                          </div>
                          <p className="text-2xs text-ink-muted mt-0.5">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle">
                    <h4 className="font-mono text-2xs uppercase tracking-wider text-ink-muted font-bold mb-3">
                      Empaneled Jury & Judges
                    </h4>
                    <div className="space-y-2">
                      {compDetails.judges?.map((j) => (
                        <div key={j._id} className="p-2.5 rounded-lg bg-surface-secondary/50 border border-surface-border text-xs">
                          <p className="font-semibold text-ink-primary">{j.name}</p>
                          <p className="text-2xs text-ink-muted">{j.designation} • {j.organization}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Register Squad for Competition">
        <form onSubmit={handleRegisterTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Squad / Team Name *</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. CyberKnights"
              className="input-field text-sm"
            />
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            You (<strong className="font-semibold text-ink-primary">{user?.name}</strong>) will be designated as Team Captain. Teammates can be managed from your contest roster.
          </p>
          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingTeam}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submittingTeam ? 'Enrolling...' : 'Confirm Enrollment'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isCompModalOpen} onClose={() => setIsCompModalOpen(false)} title="Schedule New Tournament">
        <form onSubmit={handleCreateComp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Host Festival *</label>
            <select
              value={compForm.eventId}
              onChange={(e) => setCompForm({ ...compForm, eventId: e.target.value })}
              className="input-field text-sm"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Tournament Title *</label>
            <input
              type="text"
              required
              value={compForm.competitionName}
              onChange={(e) => setCompForm({ ...compForm, competitionName: e.target.value })}
              placeholder="e.g. AlgoSprint Hackathon"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={compForm.description}
              onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
              placeholder="Tournament scope & challenge statement..."
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Category</label>
              <select
                value={compForm.competitionType}
                onChange={(e) => setCompForm({ ...compForm, competitionType: e.target.value })}
                className="input-field text-sm"
              >
                <option value="hackathon">Hackathon</option>
                <option value="coding">Coding</option>
                <option value="quiz">Quiz</option>
                <option value="robotics">Robotics</option>
                <option value="gaming">Gaming</option>
                <option value="music">Music</option>
                <option value="dance">Dance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Max Squads</label>
              <input
                type="number"
                min="1"
                value={compForm.maximumTeams}
                onChange={(e) => setCompForm({ ...compForm, maximumTeams: e.target.value })}
                className="input-field text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Squad Size</label>
              <input
                type="number"
                min="1"
                value={compForm.teamSizeLimit}
                onChange={(e) => setCompForm({ ...compForm, teamSizeLimit: e.target.value })}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsCompModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingComp}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submittingComp ? 'Publishing...' : 'Publish Tournament'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

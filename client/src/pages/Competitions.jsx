import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Trophy, Users, Award, PlusCircle, CheckCircle2, Calendar, FileText, Sparkles } from 'lucide-react';

export default function Competitions() {
  const { role, user } = useAuth();
  const [competitions, setCompetitions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState(null);
  const [compDetails, setCompDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Modals
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // New Comp Form
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
      if (eventsRes.data.success && eventsRes.data.events.length > 0) {
        setEvents(eventsRes.data.events);
        setCompForm((prev) => ({ ...prev, eventId: eventsRes.data.events[0]._id }));

        // Fetch competitions for all events
        const compPromises = eventsRes.data.events.map((e) =>
          api.get(`/competitions/event/${e._id}`)
        );
        const compResults = await Promise.all(compPromises);
        const allComps = compResults.flatMap((r) => (r.data.success ? r.data.competitions : []));
        setCompetitions(allComps);

        if (allComps.length > 0) {
          loadCompDetails(allComps[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompDetails = async (compId) => {
    try {
      setDetailsLoading(true);
      setSelectedComp(compId);
      const res = await api.get(`/competitions/${compId}`);
      if (res.data.success) {
        setCompDetails(res.data);
      }
    } catch (err) {
      console.error(err);
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
      const res = await api.post('/competitions/teams', {
        competitionId: selectedComp,
        teamName
      });
      if (res.data.success) {
        setIsTeamModalOpen(false);
        setTeamName('');
        setActionMsg(`Team "${res.data.team.teamName}" registered successfully!`);
        loadCompDetails(selectedComp);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register team.');
    }
  };

  const handleCreateComp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/competitions', compForm);
      if (res.data.success) {
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
    }
  };

  const canCreate = role === 'admin' || role === 'organizer';

  if (loading) return <LoadingSpinner message="Loading college competitions & hackathons..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Competitions, Hackathons & Judging</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse competitive events, register teams, check criteria & view final announced rankings
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCompModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Competition</span>
          </button>
        )}
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {competitions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No competitions found</h3>
          <p className="text-xs text-slate-500 mt-1">Use the button above to create a competition under an event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Competition Selector List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Contests</h3>
            {competitions.map((comp) => {
              const isSelected = selectedComp === comp._id;
              return (
                <div
                  key={comp._id}
                  onClick={() => loadCompDetails(comp._id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <Badge variant={comp.competitionType}>{comp.competitionType}</Badge>
                    <span className="text-[10px] font-semibold uppercase text-slate-400">
                      Max {comp.maximumTeams} Teams
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{comp.competitionName}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{comp.description}</p>
                </div>
              );
            })}
          </div>

          {/* Right: Competition Deep-Dive (Teams, Judging, Results, Prizes) */}
          <div className="lg:col-span-2 space-y-5">
            {detailsLoading || !compDetails ? (
              <LoadingSpinner message="Loading competition leaderboard..." />
            ) : (
              <>
                {/* Header Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={compDetails.competition.competitionType}>
                          {compDetails.competition.competitionType}
                        </Badge>
                        <span className="text-xs text-slate-400 font-medium">
                          Team Size: Up to {compDetails.competition.teamSizeLimit} members
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">
                        {compDetails.competition.competitionName}
                      </h2>
                    </div>

                    <button
                      onClick={() => setIsTeamModalOpen(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4" />
                      <span>Register Team</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    {compDetails.competition.description}
                  </p>

                  {compDetails.competition.rules && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800">Contest Rules:</span>
                        <p className="mt-0.5">{compDetails.competition.rules}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prizes and Announced Results Podium */}
                {compDetails.prizes && compDetails.prizes.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">Prizes & Podium Awards</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {compDetails.prizes.map((p) => (
                        <div key={p._id} className="bg-white p-3.5 rounded-xl border border-amber-200/70 shadow-sm">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            Position #{p.position}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-1">{p.prizeName}</h4>
                          <p className="text-sm font-extrabold text-amber-600 mt-0.5">₹{p.amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Published Results */}
                    {compDetails.results && compDetails.results.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-amber-200/60">
                        <p className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Official Announced Winners:
                        </p>
                        <div className="space-y-2">
                          {compDetails.results.map((r) => (
                            <div key={r._id} className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                                  {r.position}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900">{r.team?.teamName || 'Winner Team'}</p>
                                  <span className="text-[11px] text-slate-400">Score: {r.finalScore} / 100</span>
                                </div>
                              </div>
                              <span className="font-semibold text-indigo-600">{r.prize?.prizeName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Teams Registered */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Registered Teams ({compDetails.teams?.length || 0})
                    </h3>
                  </div>

                  {compDetails.teams?.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No teams registered yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {compDetails.teams.map((t) => (
                        <div key={t._id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{t.teamName}</span>
                            <span className="text-slate-400 ml-2">• Leader: {t.teamLeader?.name}</span>
                          </div>
                          <Badge variant={t.teamStatus === 'winner' ? 'published' : 'draft'}>
                            {t.teamStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Judging Criteria & Assigned Judges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                      Evaluation Criteria
                    </h4>
                    <div className="space-y-2">
                      {compDetails.criteria?.map((c) => (
                        <div key={c._id} className="p-2.5 rounded-lg bg-slate-50 text-xs">
                          <div className="flex justify-between font-semibold text-slate-800">
                            <span>{c.criteriaName}</span>
                            <span>Max: {c.maximumScore} pts</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                      Assigned Panel Judges
                    </h4>
                    <div className="space-y-2">
                      {compDetails.judges?.map((j) => (
                        <div key={j._id} className="p-2.5 rounded-lg bg-slate-50 text-xs">
                          <p className="font-semibold text-slate-900">{j.name}</p>
                          <p className="text-[11px] text-slate-500">{j.designation} • {j.organization}</p>
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

      {/* Team Registration Modal */}
      <Modal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Register Team for Competition">
        <form onSubmit={handleRegisterTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Team Name *</label>
            <input
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. CyberKnights"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
          <p className="text-xs text-slate-500">
            You ({user?.name}) will be assigned as the Team Leader. You can add more teammates from your dashboard.
          </p>
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTeamModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Confirm Registration
            </button>
          </div>
        </form>
      </Modal>

      {/* Create Competition Modal */}
      <Modal isOpen={isCompModalOpen} onClose={() => setIsCompModalOpen(false)} title="Create New Event Competition">
        <form onSubmit={handleCreateComp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Host Event *</label>
            <select
              value={compForm.eventId}
              onChange={(e) => setCompForm({ ...compForm, eventId: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              {events.map((e) => (
                <option key={e._id} value={e._id}>{e.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Competition Name *</label>
            <input
              type="text"
              required
              value={compForm.competitionName}
              onChange={(e) => setCompForm({ ...compForm, competitionName: e.target.value })}
              placeholder="e.g. AlgoSprint Hackathon"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={2}
              value={compForm.description}
              onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
              placeholder="Contest objectives..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={compForm.competitionType}
                onChange={(e) => setCompForm({ ...compForm, competitionType: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Teams</label>
              <input
                type="number"
                min={1}
                value={compForm.maximumTeams}
                onChange={(e) => setCompForm({ ...compForm, maximumTeams: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Team Size</label>
              <input
                type="number"
                min={1}
                value={compForm.teamSizeLimit}
                onChange={(e) => setCompForm({ ...compForm, teamSizeLimit: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCompModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Publish Competition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

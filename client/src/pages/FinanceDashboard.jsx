import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PlusCircle,
  FileSpreadsheet,
  AlertCircle,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  PieChart
} from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

export default function FinanceDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedClubFilter, setSelectedClubFilter] = useState('ALL');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expenseCategory: 'equipment',
    description: ''
  });

  const [revenueForm, setRevenueForm] = useState({
    amount: '',
    revenueType: 'sponsorship',
    description: ''
  });

  const [budgetForm, setBudgetForm] = useState({
    allocatedAmount: '',
    approvedAmount: '',
    budgetStatus: 'approved'
  });

  const availableClubs = React.useMemo(() => {
    const clubMap = new Map();
    events.forEach((ev) => {
      if (ev.club && ev.club._id) {
        clubMap.set(ev.club._id.toString(), ev.club);
      }
    });
    return Array.from(clubMap.values());
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    if (selectedClubFilter === 'ALL') return events;
    return events.filter((ev) => (ev.club?._id || ev.club)?.toString() === selectedClubFilter);
  }, [events, selectedClubFilter]);

  const loadFinancials = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      setFinanceLoading(true);
      const res = await api.get(`/finances/event/${eventId}`);
      if (res.data && res.data.success) {
        setFinancials(res.data);
      } else {
        setFinancials(null);
      }
    } catch (err) {
      console.error('Failed to load event financials:', err);
      // Keep existing data or empty summary rather than crashing
    } finally {
      setFinanceLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/finances/events');
      if (res.data && res.data.success && Array.isArray(res.data.events) && res.data.events.length > 0) {
        setEvents(res.data.events);
        const initialId = res.data.events[0]._id;
        setSelectedEventId(initialId);
        await loadFinancials(initialId);
      } else {
        setEvents([]);
        setSelectedEventId('');
        setFinancials(null);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Unable to load events or access finance records.');
    } finally {
      setLoading(false);
    }
  }, [loadFinancials]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleClubFilterChange = (e) => {
    const clubId = e.target.value;
    setSelectedClubFilter(clubId);
    const matching = clubId === 'ALL' ? events : events.filter((ev) => (ev.club?._id || ev.club)?.toString() === clubId);
    if (matching.length > 0) {
      setSelectedEventId(matching[0]._id);
      loadFinancials(matching[0]._id);
    } else {
      setSelectedEventId('');
      setFinancials(null);
    }
  };

  const handleEventChange = async (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    await loadFinancials(id);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    try {
      setSubmitting(true);
      const res = await api.post('/finances/expense', {
        ...expenseForm,
        eventId: selectedEventId
      });
      if (res.data && res.data.success) {
        setIsExpenseModalOpen(false);
        setExpenseForm({ amount: '', expenseCategory: 'equipment', description: '' });
        await loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    try {
      setSubmitting(true);
      const res = await api.post('/finances/revenue', {
        ...revenueForm,
        eventId: selectedEventId
      });
      if (res.data && res.data.success) {
        setIsRevenueModalOpen(false);
        setRevenueForm({ amount: '', revenueType: 'sponsorship', description: '' });
        await loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record revenue');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    try {
      setSubmitting(true);
      const res = await api.post('/finances/budget', {
        ...budgetForm,
        eventId: selectedEventId
      });
      if (res.data && res.data.success) {
        setIsBudgetModalOpen(false);
        await loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update budget');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Reconciling financial ledger & balance sheet..." />;
  }

  if (error) {
    return (
      <div className="bg-surface-primary border border-surface-border rounded-xl p-8 text-center max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-status-error flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display font-bold text-xl text-ink-primary mb-2">Financial Records Inaccessible</h2>
        <p className="text-sm text-ink-muted mb-6">{error}</p>
        <button
          onClick={fetchEvents}
          className="btn-accent inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-surface-primary border border-surface-border rounded-xl p-12 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-surface-secondary text-ink-muted flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="font-display font-bold text-xl text-ink-primary mb-2">No Authorized Event Ledgers</h2>
        <p className="text-sm text-ink-muted mb-6">
          You do not currently manage any event finances. To access finance records, you must be designated as an organizer for a club and host events with budget specifications.
        </p>
      </div>
    );
  }

  const selectedEvent = filteredEvents.find((ev) => ev._id === selectedEventId) || events.find((ev) => ev._id === selectedEventId) || events[0];
  const summary = financials?.summary || {
    budget: null,
    totalRevenue: 0,
    totalExpenditure: 0,
    profit: 0,
    isProfitable: true
  };

  const approvedBudget = summary.budget?.approvedAmount || 0;
  const allocatedBudget = summary.budget?.allocatedAmount || 0;
  const totalRevenue = summary.totalRevenue || 0;
  const totalExpenditure = summary.totalExpenditure || 0;
  const netProfit = summary.profit !== undefined ? summary.profit : (totalRevenue - totalExpenditure);
  const isProfitable = netProfit >= 0;

  const budgetUtilization = approvedBudget > 0 ? Math.min(100, Math.round((totalExpenditure / approvedBudget) * 100)) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="font-mono text-xs uppercase tracking-widest text-brand-accent font-semibold">
              Treasury & Accounts
            </span>
            <span className="text-surface-border">•</span>
            <span className="inline-flex items-center text-xs font-mono text-ink-muted bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
              3NF Compliant
            </span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Event Finances
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Real-time balance sheet, automated ledger reconciliations, and budget tracking for campus festivals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {availableClubs.length > 1 && (
            <div className="relative">
              <label htmlFor="club-filter" className="sr-only">Filter by Club</label>
              <select
                id="club-filter"
                value={selectedClubFilter}
                onChange={handleClubFilterChange}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold bg-surface-primary border border-surface-border rounded-lg shadow-subtle focus:outline-none focus:border-brand-accent transition-colors pr-8 cursor-pointer"
              >
                <option value="ALL">All Authorized Clubs ({availableClubs.length})</option>
                {availableClubs.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <label htmlFor="event-select" className="sr-only">Select Event</label>
            <select
              id="event-select"
              value={selectedEventId}
              onChange={handleEventChange}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium bg-surface-primary border border-surface-border rounded-lg shadow-subtle focus:outline-none focus:border-brand-accent transition-colors pr-8 cursor-pointer"
            >
              {filteredEvents.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.title} {e.club?.name ? `(${e.club.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadFinancials(selectedEventId)}
            title="Refresh Ledger"
            disabled={financeLoading || !selectedEventId}
            className="p-2.5 border border-surface-border rounded-lg bg-surface-primary hover:bg-surface-secondary text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${financeLoading ? 'animate-spin text-brand-accent' : ''}`} />
          </button>
        </div>
      </div>

      {selectedEvent && (
        <div className="bg-surface-primary border border-surface-border rounded-xl p-5 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">Active Ledger:</span>
              <span className="font-display font-bold text-lg text-ink-primary">{selectedEvent.title}</span>
              <Badge variant="outline" size="sm">{selectedEvent.category || 'General'}</Badge>
            </div>
            <p className="text-xs text-ink-muted line-clamp-1">
              {selectedEvent.description || 'Campus festival event ledger.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setBudgetForm({
                  allocatedAmount: allocatedBudget || '',
                  approvedAmount: approvedBudget || '',
                  budgetStatus: summary.budget?.budgetStatus || 'approved'
                });
                setIsBudgetModalOpen(true);
              }}
              className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
            >
              <Wallet className="w-3.5 h-3.5 text-brand-accent" />
              <span>{summary.budget ? 'Update Budget' : 'Set Budget'}</span>
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 hover:border-status-error/40"
            >
              <ArrowDownRight className="w-3.5 h-3.5 text-status-error" />
              <span>Record Expense</span>
            </button>
            <button
              onClick={() => setIsRevenueModalOpen(true)}
              className="btn-secondary text-xs px-3.5 py-2 inline-flex items-center gap-1.5 hover:border-status-success/40"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-status-success" />
              <span>Record Revenue</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Approved Budget"
          value={`₹${formatINR(approvedBudget)}`}
          subtitle={
            summary.budget
              ? `Allocated: ₹${formatINR(allocatedBudget)} (${summary.budget.budgetStatus})`
              : 'No formal budget set'
          }
          icon={Wallet}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${formatINR(totalRevenue)}`}
          subtitle="Sponsorships + Grants + Fees"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Expenditure"
          value={`₹${formatINR(totalExpenditure)}`}
          subtitle="Equipment, logistics, catering"
          icon={TrendingDown}
        />
        <StatCard
          title="Net Position"
          value={`₹${formatINR(netProfit)}`}
          subtitle={isProfitable ? 'Operational Surplus' : 'Operating Deficit'}
          icon={DollarSign}
        />
      </div>

      {approvedBudget > 0 && (
        <div className="bg-surface-primary border border-surface-border rounded-xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-ink-primary">Budget Utilization</span>
            <span className="font-mono text-ink-muted">
              ₹{formatINR(totalExpenditure)} spent of ₹{formatINR(approvedBudget)} ({budgetUtilization}%)
            </span>
          </div>
          <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetUtilization > 95
                  ? 'bg-status-error'
                  : budgetUtilization > 75
                  ? 'bg-status-warning'
                  : 'bg-brand-accent'
              }`}
              style={{ width: `${budgetUtilization}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-status-error flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink-primary">Expenditure Ledger</h3>
                <p className="text-2xs text-ink-muted">
                  {financials?.expenses?.length || 0} debit entries
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {!financials || !financials.expenses || financials.expenses.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
              No expenditure entries logged for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-secondary text-ink-muted uppercase font-mono text-2xs border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {financials.expenses.map((exp) => (
                    <tr key={exp._id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-ink-primary">
                        {exp.description || 'Operational Expense'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize font-mono text-2xs bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
                          {exp.expenseCategory || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-status-error">
                        -₹{formatINR(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-status-success flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink-primary">Revenue Ledger</h3>
                <p className="text-2xs text-ink-muted">
                  {financials?.revenues?.length || 0} credit entries
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRevenueModalOpen(true)}
              className="text-xs font-semibold text-brand-accent hover:text-brand-accent-hover inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {!financials || !financials.revenues || financials.revenues.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted border border-dashed border-surface-border rounded-lg">
              No revenue inflow entries logged for this event.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-surface-secondary text-ink-muted uppercase font-mono text-2xs border-b border-surface-border">
                  <tr>
                    <th className="py-2.5 px-3">Source / Details</th>
                    <th className="py-2.5 px-3">Inflow Type</th>
                    <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {financials.revenues.map((rev) => (
                    <tr key={rev._id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-ink-primary">
                        {rev.description || 'Event Revenue'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="capitalize font-mono text-2xs bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
                          {(rev.revenueType || 'Other').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-status-success">
                        +₹{formatINR(rev.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Record Event Expenditure"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              placeholder="e.g. 15000"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Expense Category *
            </label>
            <select
              value={expenseForm.expenseCategory}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseCategory: e.target.value })}
              className="input-field text-sm"
            >
              <option value="equipment">Equipment & Sound</option>
              <option value="catering">Catering & Refreshments</option>
              <option value="marketing">Marketing & Printing</option>
              <option value="prizes">Prizes & Trophies</option>
              <option value="logistics">Logistics & Transportation</option>
              <option value="miscellaneous">Miscellaneous</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Description / Voucher Notes
            </label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="e.g. Stage lights and sound console vendor rental"
              className="input-field text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Save Expense Entry'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRevenueModalOpen}
        onClose={() => setIsRevenueModalOpen(false)}
        title="Record Event Revenue"
      >
        <form onSubmit={handleAddRevenue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Revenue Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={revenueForm.amount}
              onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
              placeholder="e.g. 50000"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Revenue Source *
            </label>
            <select
              value={revenueForm.revenueType}
              onChange={(e) => setRevenueForm({ ...revenueForm, revenueType: e.target.value })}
              className="input-field text-sm"
            >
              <option value="sponsorship">Corporate Sponsorship</option>
              <option value="registration_fees">Delegate / Registration Fees</option>
              <option value="merchandise">Merchandise Sales</option>
              <option value="grant">University / College Grant</option>
              <option value="other">Other Inflow</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Description / Reference
            </label>
            <input
              type="text"
              value={revenueForm.description}
              onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
              placeholder="e.g. Title sponsor contract installment"
              className="input-field text-sm"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsRevenueModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Save Revenue Entry'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Configure Event Budget"
      >
        <form onSubmit={handleSetBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Allocated Budget (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={budgetForm.allocatedAmount}
              onChange={(e) => setBudgetForm({ ...budgetForm, allocatedAmount: e.target.value })}
              placeholder="e.g. 75000"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Approved Budget Ceiling (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={budgetForm.approvedAmount}
              onChange={(e) => setBudgetForm({ ...budgetForm, approvedAmount: e.target.value })}
              placeholder="e.g. 100000"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Approval Status
            </label>
            <select
              value={budgetForm.budgetStatus}
              onChange={(e) => setBudgetForm({ ...budgetForm, budgetStatus: e.target.value })}
              className="input-field text-sm"
            >
              <option value="approved">Approved by Dean / Committee</option>
              <option value="pending">Pending Review</option>
              <option value="draft">Draft Estimate</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setIsBudgetModalOpen(false)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-accent text-xs px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Confirm Budget'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

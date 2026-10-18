import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { DollarSign, TrendingUp, TrendingDown, Wallet, PlusCircle, CheckCircle2, PieChart } from 'lucide-react';

export default function FinanceDashboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isRevenueModalOpen, setIsRevenueModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Forms
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      if (res.data.success && res.data.events.length > 0) {
        setEvents(res.data.events);
        setSelectedEventId(res.data.events[0]._id);
        loadFinancials(res.data.events[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancials = async (eventId) => {
    try {
      const res = await api.get(`/finances/event/${eventId}`);
      if (res.data.success) {
        setFinancials(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEventChange = (e) => {
    const id = e.target.value;
    setSelectedEventId(id);
    loadFinancials(id);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finances/expense', {
        ...expenseForm,
        eventId: selectedEventId
      });
      if (res.data.success) {
        setIsExpenseModalOpen(false);
        setExpenseForm({ amount: '', expenseCategory: 'equipment', description: '' });
        loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record expense');
    }
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finances/revenue', {
        ...revenueForm,
        eventId: selectedEventId
      });
      if (res.data.success) {
        setIsRevenueModalOpen(false);
        setRevenueForm({ amount: '', revenueType: 'sponsorship', description: '' });
        loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record revenue');
    }
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finances/budget', {
        ...budgetForm,
        eventId: selectedEventId
      });
      if (res.data.success) {
        setIsBudgetModalOpen(false);
        loadFinancials(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update budget');
    }
  };

  if (loading) return <LoadingSpinner message="Calculating financial ledger & balance sheet..." />;

  const summary = financials?.summary || {
    totalRevenue: 0,
    totalExpenditure: 0,
    profit: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Event Budgets, Expenses & Revenue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial control compliant with 3NF (dynamic calculation of Total_Revenue, Total_Expenditure, and Profit)
          </p>
        </div>

        {/* Event Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Select Event:</label>
          <select
            value={selectedEventId}
            onChange={handleEventChange}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Financial Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Approved Budget"
          value={`₹${(summary.budget?.approvedAmount || 0).toLocaleString()}`}
          subtitle={`Allocated: ₹${(summary.budget?.allocatedAmount || 0).toLocaleString()} (${summary.budget?.budgetStatus || 'Not set'})`}
          icon={Wallet}
          color="indigo"
        />
        <StatCard
          title="Total Revenue (Calculated)"
          value={`₹${summary.totalRevenue.toLocaleString()}`}
          subtitle="Sponsorships + Registrations + Grants"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Total Expenditure"
          value={`₹${summary.totalExpenditure.toLocaleString()}`}
          subtitle="Equipment + Catering + Prizes + Logistics"
          icon={TrendingDown}
          color="amber"
        />
        <StatCard
          title="Net Profit / Surplus"
          value={`₹${summary.profit.toLocaleString()}`}
          subtitle={summary.isProfitable ? 'Surplus Balance' : 'Budget Deficit'}
          icon={DollarSign}
          color={summary.isProfitable ? 'emerald' : 'rose'}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setIsBudgetModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <Wallet className="w-3.5 h-3.5" /> Set Budget
        </button>
        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Record Expense
        </button>
        <button
          onClick={() => setIsRevenueModalOpen(true)}
          className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-3.5 h-3.5" /> Record Revenue
        </button>
      </div>

      {/* Ledger Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            Expenses Ledger ({financials?.expenses?.length || 0})
          </h3>

          {!financials || !financials.expenses || financials.expenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded for this event.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financials.expenses.map((exp) => (
                    <tr key={exp._id}>
                      <td className="py-2 px-3 font-medium text-slate-900">{exp.description || 'Expense'}</td>
                      <td className="py-2 px-3 capitalize">{exp.expenseCategory}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600">
                        ₹{exp.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Revenues Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Revenues Ledger ({financials?.revenues?.length || 0})
          </h3>

          {!financials || !financials.revenues || financials.revenues.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No revenues recorded for this event.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Source Type</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financials.revenues.map((rev) => (
                    <tr key={rev._id}>
                      <td className="py-2 px-3 font-medium text-slate-900">{rev.description || 'Revenue'}</td>
                      <td className="py-2 px-3 capitalize">{rev.revenueType.replace('_', ' ')}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">
                        ₹{rev.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Expense Modal */}
      <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Record Event Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
            <select
              value={expenseForm.expenseCategory}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseCategory: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
              placeholder="e.g. Stage lights and projector rental"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl">Save Expense</button>
          </div>
        </form>
      </Modal>

      {/* Record Revenue Modal */}
      <Modal isOpen={isRevenueModalOpen} onClose={() => setIsRevenueModalOpen(false)} title="Record Event Revenue">
        <form onSubmit={handleAddRevenue} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Amount (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={revenueForm.amount}
              onChange={(e) => setRevenueForm({ ...revenueForm, amount: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Source *</label>
            <select
              value={revenueForm.revenueType}
              onChange={(e) => setRevenueForm({ ...revenueForm, revenueType: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="sponsorship">Sponsorship</option>
              <option value="registration_fees">Registration Fees</option>
              <option value="merchandise">Merchandise Sales</option>
              <option value="grant">College / University Grant</option>
              <option value="other">Other Inflow</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={revenueForm.description}
              onChange={(e) => setRevenueForm({ ...revenueForm, description: e.target.value })}
              placeholder="e.g. Associate sponsor grant"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsRevenueModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">Save Revenue</button>
          </div>
        </form>
      </Modal>

      {/* Set Budget Modal */}
      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title="Configure Event Budget">
        <form onSubmit={handleSetBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Allocated Budget (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={budgetForm.allocatedAmount}
              onChange={(e) => setBudgetForm({ ...budgetForm, allocatedAmount: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Approved Budget (₹) *</label>
            <input
              type="number"
              required
              min={1}
              value={budgetForm.approvedAmount}
              onChange={(e) => setBudgetForm({ ...budgetForm, approvedAmount: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={budgetForm.budgetStatus}
              onChange={(e) => setBudgetForm({ ...budgetForm, budgetStatus: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Update Budget</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

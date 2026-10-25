import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Utensils, Coffee, PlusCircle, CheckCircle2, Phone, Mail, DollarSign } from 'lucide-react';

const formatINR = (val) => {
  const num = Number(val);
  return isNaN(num) ? '0' : num.toLocaleString('en-IN');
};

export default function CateringManager() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [cateringOrders, setCateringOrders] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    catererName: '',
    contactPerson: '',
    phone: '',
    email: '',
    menuItems: [
      { menuItem: 'Buffet Lunch Meal', quantity: 100, costPerUnit: 120 },
      { menuItem: 'Coffee & Refreshments', quantity: 150, costPerUnit: 35 }
    ]
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      if (res.data?.success && Array.isArray(res.data.events) && res.data.events.length > 0) {
        setEvents(res.data.events);
        setSelectedEventId(res.data.events[0]._id);
        await loadCatering(res.data.events[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatering = async (eventId) => {
    if (!eventId) return;
    try {
      const res = await api.get(`/catering/event/${eventId}`);
      if (res.data?.success) {
        setCateringOrders(res.data.catering || []);
        setTotalCost(res.data.totalCateringCost || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateCatering = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await api.post('/catering', {
        ...form,
        eventId: selectedEventId,
        menu: form.menuItems
      });
      if (res.data?.success) {
        setIsModalOpen(false);
        await loadCatering(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save catering order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMenuItemChange = (index, field, value) => {
    const updated = [...form.menuItems];
    updated[index][field] = field === 'menuItem' ? value : Number(value);
    setForm({ ...form, menuItems: updated });
  };

  const addMenuRow = () => {
    setForm({
      ...form,
      menuItems: [...form.menuItems, { menuItem: '', quantity: 50, costPerUnit: 50 }]
    });
  };

  if (loading) {
    return <LoadingSpinner message="Calculating catering requisitions & menus..." />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Hospitality Operations
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">1NF Atomic Orders</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Catering & Hospitality
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Atomic food & beverage contracts: dynamic Quantity × Unit_Cost line-item calculations.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-accent text-xs px-4 py-2.5 inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Book Catering Order</span>
        </button>
      </div>

      {/* Event Selector & Cost summary */}
      <div className="bg-surface-primary rounded-xl border border-surface-border p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="catering-event-select" className="text-xs font-semibold text-ink-secondary whitespace-nowrap">
            Festival Ledger:
          </label>
          <select
            id="catering-event-select"
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              loadCatering(e.target.value);
            }}
            className="px-3.5 py-1.5 text-xs font-medium bg-surface-primary border border-surface-border rounded-lg shadow-subtle"
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-muted">Total Food & Beverage Cost</span>
          <p className="text-xl font-mono font-bold text-brand-accent mt-0.5">₹{formatINR(totalCost)}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-bold">
          Active Hospitality Contracts ({cateringOrders.length})
        </h3>

        {cateringOrders.length === 0 ? (
          <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-8 text-center text-xs text-ink-muted">
            No catering contracts assigned to this festival yet. Click "Book Catering Order" to requisition meals.
          </div>
        ) : (
          <div className="space-y-4">
            {cateringOrders.map((ord) => (
              <div key={ord._id} className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-border">
                  <div>
                    <h4 className="font-display font-bold text-lg text-ink-primary">{ord.catererName}</h4>
                    <p className="text-xs text-ink-muted mt-0.5">Liaison: {ord.contactPerson} • {ord.phone || 'No phone'}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-2xs font-mono uppercase text-ink-muted">Total Cost</span>
                    <p className="font-mono font-bold text-base text-ink-primary">₹{formatINR(ord.totalCost)}</p>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-secondary text-ink-muted font-mono text-2xs uppercase border-b border-surface-border">
                      <tr>
                        <th className="py-2 px-3">Item / Course</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2 px-3 text-right">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {ord.menu?.map((m, idx) => (
                        <tr key={idx} className="hover:bg-surface-secondary/40">
                          <td className="py-2.5 px-3 font-medium text-ink-primary">{m.menuItem}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{m.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{formatINR(m.costPerUnit)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-ink-primary">
                            ₹{formatINR(m.quantity * m.costPerUnit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Book Catering Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Commission Catering Order">
        <form onSubmit={handleCreateCatering} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">Caterer Agency / Vendor *</label>
            <input
              type="text"
              required
              value={form.catererName}
              onChange={(e) => setForm({ ...form, catererName: e.target.value })}
              placeholder="e.g. Royal Campus Kitchens"
              className="input-field text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="Manager Name"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone Number"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email Address"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-ink-primary">Menu Line Items</span>
              <button
                type="button"
                onClick={addMenuRow}
                className="text-xs text-brand-accent hover:text-brand-accent-hover font-semibold inline-flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {form.menuItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    required
                    value={item.menuItem}
                    onChange={(e) => handleMenuItemChange(index, 'menuItem', e.target.value)}
                    placeholder="Menu item"
                    className="col-span-6 input-field text-xs"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleMenuItemChange(index, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="col-span-3 input-field text-xs"
                  />
                  <input
                    type="number"
                    required
                    min="1"
                    value={item.costPerUnit}
                    onChange={(e) => handleMenuItemChange(index, 'costPerUnit', e.target.value)}
                    placeholder="₹ Rate"
                    className="col-span-3 input-field text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-surface-border">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary text-xs px-4 py-2">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-accent text-xs px-5 py-2 disabled:opacity-50">
              {submitting ? 'Commissioning...' : 'Save Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

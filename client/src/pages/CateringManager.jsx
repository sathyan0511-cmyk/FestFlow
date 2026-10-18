import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import { Utensils, Coffee, PlusCircle, CheckCircle2, Phone, Mail, DollarSign } from 'lucide-react';

export default function CateringManager() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [cateringOrders, setCateringOrders] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    catererName: '',
    contactPerson: '',
    phone: '',
    email: '',
    menuItems: [
      { menuItem: 'Buffet Lunch Meal', quantity: 100, costPerUnit: 120 },
      { menuItem: 'Coffee & Snacks', quantity: 150, costPerUnit: 35 }
    ]
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events');
      if (res.data.success && res.data.events.length > 0) {
        setEvents(res.data.events);
        setSelectedEventId(res.data.events[0]._id);
        loadCatering(res.data.events[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatering = async (eventId) => {
    try {
      const res = await api.get(`/catering/event/${eventId}`);
      if (res.data.success) {
        setCateringOrders(res.data.catering);
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
      const res = await api.post('/catering', {
        ...form,
        eventId: selectedEventId,
        menu: form.menuItems
      });
      if (res.data.success) {
        setIsModalOpen(false);
        loadCatering(selectedEventId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save catering');
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

  if (loading) return <LoadingSpinner message="Loading catering & hospitality services..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catering, Hospitality & Menu</h1>
          <p className="text-xs text-slate-500 mt-1">
            Normalized 1NF / 3NF meal orders: Atomic menu rows with Quantity × Cost_Per_Unit and dynamically computed total cost
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" /> Book Catering Service
        </button>
      </div>

      {/* Event Selector & Cost summary */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Select Fest / Event:</label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              loadCatering(e.target.value);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl"
          >
            {events.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-slate-500">Total Catering Expenditure (Derived):</span>
          <p className="text-lg font-extrabold text-amber-600">₹{totalCost.toLocaleString()}</p>
        </div>
      </div>

      {/* Catering Orders List */}
      {cateringOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No catering orders registered</h3>
          <p className="text-xs text-slate-500 mt-1">Schedule meals for attendees using the button above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cateringOrders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={order.status}>{order.status}</Badge>
                    <span className="text-xs text-slate-400">
                      Service Date: {new Date(order.serviceDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{order.catererName}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                    <span>Contact: {order.contactPerson || 'Vendor'}</span>
                    {order.phone && <span>📞 {order.phone}</span>}
                    {order.email && <span>✉ {order.email}</span>}
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400">Order Total (Virtual):</span>
                  <p className="text-base font-extrabold text-indigo-600">
                    ₹{(order.totalCost || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Atomic Menu Table (1NF Compliant) */}
              <div>
                <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-indigo-500" /> Itemized Menu Items (CATERING_MENU):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2 px-3">Menu Item</th>
                        <th className="py-2 px-3 text-center">Quantity</th>
                        <th className="py-2 px-3 text-right">Cost Per Unit (₹)</th>
                        <th className="py-2 px-3 text-right">Subtotal (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {order.menu.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-slate-900">{item.menuItem}</td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">₹{item.costPerUnit}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            ₹{(item.quantity * item.costPerUnit).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Catering Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Book Catering Order & Menu">
        <form onSubmit={handleCreateCatering} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Caterer / Vendor Name *</label>
            <input
              type="text"
              required
              value={form.catererName}
              onChange={(e) => setForm({ ...form, catererName: e.target.value })}
              placeholder="e.g. Royal Feast Catering Co."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Atomic Menu Items */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Atomic Menu Items (Quantity & Unit Price)</label>
              <button
                type="button"
                onClick={addMenuRow}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {form.menuItems.map((item, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    type="text"
                    required
                    placeholder="Item Name"
                    value={item.menuItem}
                    onChange={(e) => handleMenuItemChange(index, 'menuItem', e.target.value)}
                    className="col-span-3 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleMenuItemChange(index, 'quantity', e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="₹ Unit"
                    value={item.costPerUnit}
                    onChange={(e) => handleMenuItemChange(index, 'costPerUnit', e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Save Catering Order</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

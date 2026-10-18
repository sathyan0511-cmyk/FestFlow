import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  MapPin,
  Ticket,
  PlusCircle,
  Sparkles,
  ShieldAlert,
  X,
  Trophy,
  Wallet,
  Briefcase,
  Utensils,
  Award,
  HeartHandshake
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role } = useAuth();

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Events & Fests', to: '/events', icon: CalendarDays },
    { label: 'Competitions', to: '/competitions', icon: Trophy },
    { label: 'Campus Clubs', to: '/clubs', icon: Building2 },
    { label: 'Venues & Halls', to: '/venues', icon: MapPin },
    { label: 'Sponsors', to: '/sponsors', icon: Briefcase },
    { label: 'Catering & Menu', to: '/catering', icon: Utensils },
    { label: 'E-Certificates', to: '/certificates', icon: Award }
  ];

  if (role === 'student') {
    navItems.push(
      { label: 'My Event Passes', to: '/my-registrations', icon: Ticket },
      { label: 'Volunteering', to: '/volunteering', icon: HeartHandshake }
    );
  }

  if (role === 'admin' || role === 'organizer') {
    navItems.push(
      { label: 'Event Finances', to: '/finances', icon: Wallet }
    );
  }

  const canCreateEvents = role === 'admin' || role === 'organizer';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
            <NavLink to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  FestFlow
                </span>
                <span className="text-[10px] block font-semibold uppercase tracking-wider text-indigo-400">
                  Campus Events
                </span>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Organizer / Admin Quick Action */}
          {canCreateEvents && (
            <div className="px-4 pt-4 pb-1 shrink-0">
              <NavLink
                to="/events/create"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-900/40 transition-all hover:shadow-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Event</span>
              </NavLink>
            </div>
          )}

          {/* Navigation Links Scrollable */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600/90 text-white shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-white" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role Info Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
              <span>Role:</span>
              <span className="capitalize text-indigo-300 font-bold">{role}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

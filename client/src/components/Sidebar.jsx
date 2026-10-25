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
  X,
  Trophy,
  Wallet,
  Briefcase,
  Utensils,
  Award,
  HeartHandshake,
  ShieldCheck,
  Compass,
  UserCheck,
  Users
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user, role } = useAuth();

  // Role-appropriate navigation items
  let navItems = [];

  if (role === 'organizer') {
    navItems = [
      { label: 'Overview', to: '/', icon: LayoutDashboard },
      { label: 'My Clubs', to: '/clubs', icon: Building2 },
      { label: 'My Club Events', to: '/events?filter=my-clubs', icon: CalendarDays },
      { label: 'My Event Passes', to: '/my-registrations', icon: Ticket },
      { label: 'Event Discovery', to: '/events', icon: Compass },
      { label: 'Event Finances', to: '/finances', icon: Wallet },
      { label: 'Sponsorships', to: '/sponsors', icon: Briefcase },
      { label: 'Catering & Menu', to: '/catering', icon: Utensils }
    ];
  } else if (role === 'faculty') {
    navItems = [
      { label: 'Overview', to: '/', icon: LayoutDashboard },
      { label: 'My Clubs', to: '/clubs', icon: Building2 },
      { label: 'Organizer Assignments', to: '/faculty/organizers', icon: UserCheck },
      { label: 'Campus Schedule', to: '/events', icon: Compass },
      { label: 'My Event Passes', to: '/my-registrations', icon: Ticket }
    ];
  } else if (role === 'student') {
    navItems = [
      { label: 'Overview', to: '/', icon: LayoutDashboard },
      { label: 'Event Discovery', to: '/events', icon: Compass },
      { label: 'My Event Passes', to: '/my-registrations', icon: Ticket },
      { label: 'My Clubs', to: '/clubs', icon: Building2 },
      { label: 'Competitions', to: '/competitions', icon: Trophy },
      { label: 'E-Certificates', to: '/certificates', icon: Award },
      { label: 'Volunteering', to: '/volunteering', icon: HeartHandshake }
    ];
  } else {
    // Admin navigation
    navItems = [
      { label: 'Overview', to: '/', icon: LayoutDashboard },
      { label: 'Event Discovery', to: '/events', icon: Compass },
      { label: 'My Event Passes', to: '/my-registrations', icon: Ticket },
      { label: 'My Clubs', to: '/clubs', icon: Building2 },
      { label: 'Faculty Management', to: '/admin/faculty', icon: ShieldCheck },
      { label: 'Venues & Halls', to: '/venues', icon: MapPin },
      { label: 'Competitions', to: '/competitions', icon: Trophy },
      { label: 'Event Finances', to: '/finances', icon: Wallet },
      { label: 'Sponsorships', to: '/sponsors', icon: Briefcase },
      { label: 'Catering & Menu', to: '/catering', icon: Utensils },
      { label: 'E-Certificates', to: '/certificates', icon: Award }
    ];
  }

  const canCreateEvents = role === 'admin' || role === 'organizer';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-ink-primary/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#181818] text-[#EFEFEA] flex flex-col justify-between border-r border-[#2C2C29] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Brand Wordmark Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#2C2C29] shrink-0">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center font-display font-bold text-white text-base">
                F
              </span>
              <div className="flex flex-col">
                <span className="font-display text-xl font-bold tracking-tight text-white flex items-center">
                  FestFlow<span className="text-accent font-sans">.</span>
                </span>
                <span className="text-[9px] font-semibold tracking-widest uppercase text-white/50 -mt-1">
                  Campus Platform
                </span>
              </div>
            </NavLink>
            <button
              onClick={onClose}
              className="lg:hidden text-white/60 hover:text-white p-1 rounded-md"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action for Organizers / Admins */}
          {canCreateEvents && (
            <div className="px-4 pt-4 pb-1 shrink-0">
              <NavLink
                to="/events/create"
                onClick={onClose}
                className="w-full btn-accent py-2 text-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Host New Event</span>
              </NavLink>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
              {role === 'faculty' ? 'Faculty Console' : role === 'organizer' ? 'Club Operations' : role === 'admin' ? 'Administration' : 'Student Portal'}
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
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-accent text-white font-semibold shadow-fest-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Role Card */}
        <div className="p-3.5 border-t border-[#2C2C29] bg-[#121212] shrink-0">
          <div className="flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">Access:</span>
              <span className="capitalize text-white font-bold text-xs">{role}</span>
            </div>
            {role === 'student' && (
              <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                Portal
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

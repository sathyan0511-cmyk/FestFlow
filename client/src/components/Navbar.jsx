import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, Sparkles } from 'lucide-react';
import Badge from './Badge';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-surface-primary/95 backdrop-blur border-b border-edge px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left mobile menu toggle & season indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-ink-secondary hover:text-ink-primary hover:bg-canvas-muted rounded-lg transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-canvas-warm border border-edge text-ink-secondary rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Campus Festival Season 2026</span>
            </span>
          </div>
        </div>

        {/* Right side authentication & profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <>
              {/* User Identity Pill */}
              <div className="flex items-center gap-3 pl-2 sm:border-l sm:border-edge">
                <div className="w-8 h-8 rounded-full bg-ink-primary text-white flex items-center justify-center font-bold text-xs shadow-fest-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-ink-primary leading-none">{user?.name}</p>
                    <Badge variant={user?.role}>{user?.role}</Badge>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5 leading-none">{user?.email}</p>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                title="Log Out of FestFlow"
                className="p-2 text-ink-muted hover:text-campus-error hover:bg-campus-error-subtle rounded-lg transition-colors"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-ink-secondary hover:text-ink-primary px-3 py-1.5 rounded-lg hover:bg-canvas-muted transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-accent py-1.5 px-3.5 text-xs"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

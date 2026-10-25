import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import ErrorBoundary from '../components/ErrorBoundary';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas-warm flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-brand-accent selection:text-white">
      {/* Editorial Watermark / Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-block group focus:outline-none">
          <span className="font-display font-bold text-4xl sm:text-5xl tracking-tight text-ink-primary">
            FestFlow<span className="text-brand-accent">.</span>
          </span>
        </Link>
        <p className="mt-2 text-2xs uppercase tracking-widest font-mono text-ink-muted">
          College Event Management System
        </p>
      </div>

      {/* Auth Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-primary border border-surface-border rounded-2xl py-8 px-6 sm:px-10 shadow-elevated">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-xs text-ink-muted">
          Campus Festivals • Hackathons • Cultural Fests • Academic Symposia
        </p>
      </div>
    </div>
  );
}

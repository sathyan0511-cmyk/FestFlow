import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="py-20 text-center max-w-md mx-auto animate-fadeIn">
      <div className="w-14 h-14 bg-surface-secondary text-brand-accent rounded-2xl flex items-center justify-center mx-auto mb-4 border border-surface-border">
        <Compass className="w-7 h-7" />
      </div>
      <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
        HTTP 404
      </span>
      <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary mt-1">
        Page Not Found
      </h1>
      <p className="text-xs text-ink-muted mt-2 leading-relaxed">
        The campus schedule or route you are looking for might have been moved, concluded, or does not exist.
      </p>
      <Link
        to="/"
        className="btn-accent text-xs px-5 py-2.5 mt-6 inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
}

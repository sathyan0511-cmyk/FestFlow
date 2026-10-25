import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  // Demo account quick filler
  const fillDemoAccount = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display font-bold text-2xl text-ink-primary">Sign In</h3>
        <p className="text-xs text-ink-muted mt-1">
          Access your festival passes, club activities, and campus schedules.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1">
            College Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. student@festflow.edu"
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-ink-secondary">
              Password
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
        >
          {loading ? 'Authenticating...' : 'Sign In to Campus'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Demo Credentials for Evaluation */}
      <div className="mt-8 pt-5 border-t border-surface-border">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" />
          <p className="text-2xs font-mono uppercase tracking-widest text-ink-muted">
            Evaluation Quick-Fill
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => fillDemoAccount('student@festflow.edu', 'StudentPassword123!')}
            className="text-2xs font-mono font-medium p-2 bg-surface-secondary hover:bg-surface-border text-ink-primary rounded-md border border-surface-border text-center transition-colors"
          >
            🎓 Student
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('organizer@festflow.edu', 'OrganizerPassword123!')}
            className="text-2xs font-mono font-medium p-2 bg-surface-secondary hover:bg-surface-border text-ink-primary rounded-md border border-surface-border text-center transition-colors"
          >
            📋 Organizer
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('faculty@festflow.edu', 'FacultyPassword123!')}
            className="text-2xs font-mono font-medium p-2 bg-surface-secondary hover:bg-surface-border text-ink-primary rounded-md border border-surface-border text-center transition-colors"
          >
            🏛️ Faculty
          </button>
          <button
            type="button"
            onClick={() => fillDemoAccount('admin@festflow.edu', 'AdminPassword123!')}
            className="text-2xs font-mono font-medium p-2 bg-surface-secondary hover:bg-surface-border text-ink-primary rounded-md border border-surface-border text-center transition-colors"
          >
            👑 Admin
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Need an account?{' '}
        <Link to="/register" className="font-semibold text-brand-accent hover:text-brand-accent-hover underline underline-offset-2">
          Register new profile
        </Link>
      </p>
    </div>
  );
}

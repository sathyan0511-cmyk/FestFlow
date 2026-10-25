import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, AlertCircle, ArrowRight } from 'lucide-react';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'student',
    registerNumber: '',
    department: 'Computer Science & Engineering',
    programme: 'B.Tech',
    yearOfStudy: '2'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const result = await register({
      ...formData,
      yearOfStudy: Number(formData.yearOfStudy)
    });
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="font-display font-bold text-2xl text-ink-primary">Create Profile</h3>
        <p className="text-xs text-ink-muted mt-1">
          Join FestFlow to RSVP for events, compete, and lead clubs.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1">
            Full Name *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. Priya Sharma"
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1">
            College Email *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="priya@college.edu"
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-secondary mb-1">
            Password (min 6 chars) *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input-field pl-9 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Campus Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="input-field text-sm"
            >
              <option value="student">Student / Participant</option>
              <option value="organizer">Club Organizer</option>
              <option value="admin">Campus Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        {formData.role === 'student' && (
          <div className="space-y-3 pt-2 border-t border-surface-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Roll / Reg Number
                </label>
                <input
                  type="text"
                  name="registerNumber"
                  value={formData.registerNumber}
                  onChange={handleChange}
                  placeholder="e.g. 2024CS101"
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">
                  Year of Study
                </label>
                <select
                  name="yearOfStudy"
                  value={formData.yearOfStudy}
                  onChange={handleChange}
                  className="input-field text-sm"
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1">
                Department
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Computer Science & Engineering"
                className="input-field text-sm"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-accent w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
        >
          {loading ? 'Creating Profile...' : 'Complete Registration'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-accent hover:text-brand-accent-hover underline underline-offset-2">
          Sign in here
        </Link>
      </p>
    </div>
  );
}

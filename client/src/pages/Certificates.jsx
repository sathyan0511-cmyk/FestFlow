import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import { Award, ShieldCheck, Search, CheckCircle2, AlertCircle, FileCheck, Calendar } from 'lucide-react';

export default function Certificates() {
  const { role } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchCode, setSearchCode] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchMyCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/my');
      if (res.data?.success && Array.isArray(res.data.certificates)) {
        setCertificates(res.data.certificates);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCertificates();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    try {
      setVerifying(true);
      setVerifyError('');
      setVerifiedResult(null);
      const res = await api.get(`/certificates/verify/${searchCode.trim()}`);
      if (res.data?.success) {
        setVerifiedResult(res.data.certificate);
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Certificate credential not found or signature invalid.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying academic cryptographic certificates..." />;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-2xs uppercase tracking-widest text-brand-accent font-semibold">
              Registrar Credentials
            </span>
            <span className="text-surface-border">•</span>
            <span className="text-2xs font-mono text-ink-muted">Public Verification</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-ink-primary tracking-tight">
            Certificates & Credentials
          </h1>
          <p className="text-xs text-ink-muted mt-1 max-w-2xl">
            Official digital certificates issued for festival participation, competitive merit, and volunteer leadership.
          </p>
        </div>
      </div>

      <div className="bg-surface-primary border border-surface-border rounded-xl p-6 sm:p-8 shadow-subtle relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-accent" />

        <div className="max-w-2xl pl-2">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-status-success" />
            <span className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-semibold">
              Live University Verification Portal
            </span>
          </div>
          <h2 className="font-display font-bold text-xl text-ink-primary">
            Verify Certificate Authenticity
          </h2>
          <p className="text-xs text-ink-muted mt-1">
            Enter the unique verification code printed on any FestFlow certificate to inspect verified university records.
          </p>

          <form onSubmit={handleVerify} className="mt-5 flex gap-2.5">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="e.g. V-FEST26-8812"
              className="input-field text-xs font-mono flex-1"
            />
            <button
              type="submit"
              disabled={verifying}
              className="btn-accent text-xs px-5 py-2.5 flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              <Search className="w-4 h-4" />
              <span>{verifying ? 'Verifying...' : 'Verify Signature'}</span>
            </button>
          </form>

          {verifyError && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 text-status-error rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifiedResult && (
            <div className="mt-5 p-5 bg-surface-secondary/70 border border-status-success/30 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-status-success font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified Official Credential</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-surface-border text-ink-primary">
                <p><span className="text-ink-muted">Conferred to:</span> <strong>{verifiedResult.user?.name}</strong></p>
                <p><span className="text-ink-muted">Department:</span> {verifiedResult.user?.department || 'University Scholar'}</p>
                <p><span className="text-ink-muted">Festival / Event:</span> <strong>{verifiedResult.event?.title}</strong></p>
                <p><span className="text-ink-muted">Credential Type:</span> <span className="capitalize font-mono font-bold text-brand-accent">{verifiedResult.certificateType}</span></p>
              </div>
              <p className="text-2xs font-mono text-ink-muted pt-2 border-t border-surface-border">
                Certificate ID: #{verifiedResult.certificateNo} • Date Issued: {new Date(verifiedResult.issueDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-mono text-2xs uppercase tracking-widest text-ink-muted font-bold">
          My Earned Credentials ({certificates.length})
        </h3>

        {certificates.length === 0 ? (
          <div className="bg-surface-primary rounded-xl border border-dashed border-surface-border p-12 text-center max-w-md mx-auto">
            <Award className="w-12 h-12 text-ink-muted/50 mx-auto mb-3" />
            <h4 className="font-display font-bold text-base text-ink-primary">No Certificates Issued</h4>
            <p className="text-xs text-ink-muted mt-1">
              Certificates of participation, merit, and volunteering are published here following event completion.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert._id}
                className="bg-surface-primary rounded-xl border border-surface-border p-6 shadow-subtle flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-2xs uppercase tracking-wider font-bold text-brand-accent bg-surface-secondary px-2.5 py-0.5 rounded border border-surface-border">
                      {cert.certificateType}
                    </span>
                    <span className="font-mono text-2xs text-ink-muted">
                      #{cert.certificateNo}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-lg text-ink-primary">{cert.event?.title}</h4>
                  <p className="text-xs text-ink-muted mt-1">Conferred upon: {cert.user?.name}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                  <span className="font-mono text-2xs text-ink-muted">
                    Issued on {new Date(cert.issueDate).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-2xs font-bold text-status-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

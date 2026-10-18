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

  // Verification state
  const [searchCode, setSearchCode] = useState('');
  const [verifiedResult, setVerifiedResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchMyCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/my');
      if (res.data.success) {
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
      if (res.data.success) {
        setVerifiedResult(res.data.certificate);
      }
    } catch (err) {
      setVerifyError(err.response?.data?.message || 'Certificate not found or invalid.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your e-credentials & certificates..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">E-Certificates & Credential Verification</h1>
        <p className="text-xs text-slate-500 mt-1">
          Official digital credentials for event participation, merit awards, volunteering, and public verification
        </p>
      </div>

      {/* Public Verification Box */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl text-white p-6 shadow-md">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Tamper-Proof Verification Portal
          </div>
          <h2 className="text-lg font-bold text-white">Verify a Certificate Authenticity</h2>
          <p className="text-xs text-slate-300 mt-1">
            Enter the unique verification code printed on any FestFlow certificate to inspect live college records.
          </p>

          <form onSubmit={handleVerify} className="mt-4 flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="e.g. V-FEST26-8812"
              className="flex-1 px-3.5 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
            />
            <button
              type="submit"
              disabled={verifying}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              {verifying ? 'Checking...' : 'Verify'}
            </button>
          </form>

          {verifyError && (
            <div className="mt-3 p-3 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifiedResult && (
            <div className="mt-4 p-4 bg-emerald-950/70 border border-emerald-600/60 rounded-xl text-xs text-emerald-200 space-y-1 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Official Verified Certificate
              </div>
              <p className="text-white font-medium">Issued to: <span className="font-bold">{verifiedResult.user?.name}</span> ({verifiedResult.user?.department || 'Student'})</p>
              <p className="text-slate-300">Event: <span className="text-white font-semibold">{verifiedResult.event?.title}</span></p>
              <p className="text-slate-300">Type: <span className="capitalize font-semibold text-emerald-300">{verifiedResult.certificateType} Certificate</span></p>
              <p className="text-[10px] text-slate-400 font-mono pt-1">Certificate #{verifiedResult.certificateNo} • Issued on {new Date(verifiedResult.issueDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* My Certificates Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-xs">
          My Earned Certificates ({certificates.length})
        </h3>

        {certificates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No certificates issued yet</h4>
            <p className="mt-1">Attend campus competitions and festivals to earn verified merit certificates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <div
                key={cert._id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider text-[10px]">
                      {cert.certificateType} Award
                    </span>
                    <Badge variant={cert.status}>{cert.status}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{cert.event?.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Issued on {new Date(cert.issueDate).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Verification Code:</span>
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {cert.verificationCode}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">#{cert.certificateNo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

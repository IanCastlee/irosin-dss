import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, ArrowRight, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { Api } from '../services/api';
import { User } from '../types';
import { brandingService, AdminBranding, DEFAULT_BRANDING } from '../services/brandingService';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
  sessionExpiredMessage?: string;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, sessionExpiredMessage }) => {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('irosin_saved_username') || 'admin';
  });
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('irosin_remember_session') === 'true';
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<AdminBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    const unsub = brandingService.subscribe((b) => setBranding(b));
    return unsub;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Normalize username input: if "admin" or username, normalize to email format
      let emailInput = username.trim();
      if (emailInput === 'admin' || !emailInput.includes('@')) {
        emailInput = 'mdrmo.admin@irosin.gov.ph';
      }

      if (rememberMe) {
        localStorage.setItem('irosin_saved_username', username.trim());
        localStorage.setItem('irosin_remember_session', 'true');
      } else {
        localStorage.removeItem('irosin_saved_username');
        localStorage.setItem('irosin_remember_session', 'false');
      }

      const res = await Api.login(emailInput, password);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b101e] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      {/* Ambient background waves & glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl"></div>
        {/* Subtle SVG wave layer */}
        <svg
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="none"
        >
          <path
            fill="#1e3a8a"
            d="M0,288L48,272C96,256,192,224,288,229.3C384,235,480,277,576,288C672,299,768,277,864,250.7C960,224,1056,192,1152,186.7C1248,181,1344,203,1392,213.3L1440,224L1440,900L1392,900C1344,900,1248,900,1152,900C1056,900,960,900,864,900C768,900,672,900,576,900C480,900,384,900,288,900C192,900,96,900,48,900L0,900Z"
          ></path>
        </svg>
      </div>

      {/* Main 2-Column Floating Card Container */}
      <div className="relative z-10 w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row my-auto">
        {/* LEFT COLUMN: Blue Branding Section */}
        <div className="w-full md:w-[44%] bg-gradient-to-b from-[#0f244c] via-[#0d1d3d] to-[#0a152b] p-6 sm:p-8 flex flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-blue-900/40 relative">
          {/* Top Tag Pill */}
          <div className="mb-6">
            <span className="px-3.5 py-1 bg-blue-500/15 border border-blue-400/30 rounded-md text-[10px] sm:text-[11px] font-mono tracking-widest text-blue-300 font-bold uppercase shadow-sm">
              {branding.systemTag || 'MDRRMO SYSTEM V2.0'}
            </span>
          </div>

          {/* Center Logo & Title Block */}
          <div className="my-auto py-4 flex flex-col items-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-2.5 bg-gradient-to-b from-blue-400/20 to-transparent border border-blue-400/30 flex items-center justify-center shadow-xl shadow-blue-950/50 mb-4 group transition-transform duration-300 hover:scale-105">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt="Organization Logo"
                  className="w-full h-full object-contain rounded-full bg-slate-950/40 p-1"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <ShieldAlert className="w-12 h-12" />
                </div>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white tracking-wider uppercase font-sans">
              {branding.orgName || 'MDRRMO IROSIN'}
            </h2>
            <p className="text-xs font-bold text-blue-300 tracking-wider uppercase mt-1">
              {branding.municipality || 'MUNICIPALITY OF IROSIN'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              {branding.province || 'Sorsogon'}
            </p>
          </div>

          {/* Bottom Descriptive Caption */}
          <div className="mt-6 pt-4 border-t border-blue-900/30 text-[10.5px] text-slate-400 font-medium space-y-0.5 w-full">
            <p>Official Disaster Risk Reduction & Management System</p>
            <p className="text-slate-500">Secure 100% Cloud-Connected Portal</p>
          </div>
        </div>

        {/* RIGHT COLUMN: Form Section */}
        <div className="w-full md:w-[56%] bg-[#111827]/95 p-6 sm:p-8 flex flex-col justify-center">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Portal Login</h1>
              <Lock className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xs text-slate-400">Enter your administrative credentials to access the portal.</p>
          </div>

          {sessionExpiredMessage && !error && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>{sessionExpiredMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0b101b] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  placeholder="Enter username (default: admin)"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0b101b] border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  placeholder="Enter password (default: admin123)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-300 font-medium cursor-pointer">
                Remember login session
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 group disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Login to Admin Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Default Access Helper Capsule */}
          <div className="flex items-center justify-between text-xs text-slate-400 mt-5 pt-4 border-t border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Default Access:</span>
            <div className="font-mono text-[11px] bg-[#0b101b] px-3 py-1 rounded-lg border border-slate-800 text-slate-300">
              <span className="text-slate-400">User:</span> <span className="text-blue-400 font-bold">admin</span>{' '}
              <span className="text-slate-600">|</span> <span className="text-slate-400">Pass:</span>{' '}
              <span className="text-blue-400 font-bold">admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


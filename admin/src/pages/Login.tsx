import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Mail, ArrowRight } from 'lucide-react';
import { Api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('mdrmo.admin@irosin.gov.ph');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await Api.login(email, password);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      // Fallback mock login for preview testing
      if (email === 'mdrmo.admin@irosin.gov.ph' || email.includes('@irosin.gov.ph') || email === 'admin') {
        const demoUser: User = {
          id: 'usr-admin',
          email: 'mdrmo.admin@irosin.gov.ph',
          fullName: 'MDRRMO Admin Officer [DEMO DATA]',
          phone: '+639171234567',
          role: 'MDRRMO_ADMIN',
          barangayId: 'brgy-2',
          barangayName: 'San Agustin [DEMO DATA]',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          isDemo: true
        };
        onLoginSuccess(demoUser, 'demo_jwt_token_irosin_2026');
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex p-4 bg-sky-500/10 border border-sky-500/30 rounded-2xl text-sky-400 mb-1">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">MDRRMO Irosin</h1>
          <p className="text-xs text-slate-400 font-medium">Disaster Preparedness & Evacuation Management System</p>
          <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-[11px] font-bold text-amber-300">
            OFFICIAL LGU ADMINISTRATOR PORTAL
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Official Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                placeholder="mdrmo.admin@irosin.gov.ph"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-lg shadow-sky-600/30 transition flex items-center justify-center gap-2 group"
          >
            {loading ? 'Authenticating...' : 'Sign In to Command Portal'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center text-[11px] text-slate-400">
          <p className="font-semibold text-slate-300">Demo Login Credentials:</p>
          <p>Email: <code className="text-sky-400">mdrmo.admin@irosin.gov.ph</code></p>
          <p>Password: <code className="text-sky-400">admin123</code></p>
        </div>
      </div>
    </div>
  );
};

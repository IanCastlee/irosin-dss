import React from 'react';
import { Settings, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

const services = [
  { name: 'Backend API', status: 'PENDING_RUN', note: 'Run: cd backend && npm run dev', url: 'http://localhost:5000/health' },
  { name: 'Firebase Firestore', status: 'PENDING_KEY', note: 'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in backend/.env' },
  { name: 'Firebase Cloud Messaging (Push)', status: 'PENDING_KEY', note: 'Requires Firebase Admin credentials in backend/.env' },
  { name: 'Google Maps API', status: 'PENDING_KEY', note: 'Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in mobile/.env and GOOGLE_MAPS_API_KEY in backend/.env' },
  { name: 'Semaphore SMS API', status: 'PENDING_KEY', note: 'Set SMS_API_KEY and SMS_SENDER_NAME in backend/.env. Mobile app NEVER accesses SMS key directly.' },
  { name: 'Official Barangay Data (LGU)', status: 'PENDING_DATA', note: 'Replace DEMO DATA with official MDRRMO Irosin records in backend mockStore or Firestore.' },
];

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">System Settings & Integration Status</h2>
        <p className="text-sm text-slate-400 mt-1">External service integration checklist and credential requirements</p>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-sm text-amber-300">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div><strong>Important Security Note:</strong> Never expose Firebase Admin, JWT, or SMS API keys to the client (browser/mobile). All sensitive credentials belong in <code>backend/.env</code> only.</div>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.name} className="glass-panel p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${s.status === 'ACTIVE' ? 'bg-emerald-500/10' : s.status === 'PENDING_RUN' ? 'bg-sky-500/10' : 'bg-amber-500/10'}`}>
                {s.status === 'ACTIVE' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
              </div>
              <div>
                <p className="font-bold text-slate-100">{s.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.note}</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase shrink-0 ${s.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : s.status === 'PENDING_RUN' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
              {s.status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-100">Quick Reference: .env Files</h3>
        <div className="space-y-2 text-xs font-mono">
          {[['backend/.env', 'PORT, JWT_SECRET, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, SMS_API_KEY, SMS_API_URL, SMS_SENDER_NAME, GOOGLE_MAPS_API_KEY'],
            ['mobile/.env', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, EXPO_PUBLIC_API_URL'],
            ['admin/.env', 'VITE_API_URL']
          ].map(([file, vars]) => (
            <div key={file} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <p className="text-sky-400 font-bold mb-1">{file}</p>
              <p className="text-slate-400 leading-relaxed">{vars}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">⚠ Never commit .env files to Git. Use .env.example as a template only.</p>
      </div>
    </div>
  );
};

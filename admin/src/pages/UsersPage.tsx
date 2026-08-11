import React, { useEffect, useState } from 'react';
import { Users, Shield, MapPin } from 'lucide-react';
import { User } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';

const roleColors: Record<string, string> = {
  MDRRMO_ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  BARANGAY_OFFICIAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  RESIDENT: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export const UsersPage: React.FC = () => {
  const [users] = useState<User[]>([
    { id: 'usr-admin', email: 'mdrmo.admin@irosin.gov.ph', fullName: 'MDRRMO Admin Officer [DEMO DATA]', phone: '+639171234567', role: 'MDRRMO_ADMIN', barangayId: 'brgy-2', barangayName: 'San Agustin [DEMO DATA]', status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
    { id: 'usr-official', email: 'official.monbon@irosin.gov.ph', fullName: 'Captain Juan Dela Cruz [DEMO DATA]', phone: '+639189876543', role: 'BARANGAY_OFFICIAL', barangayId: 'brgy-1', barangayName: 'Monbon [DEMO DATA]', status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
    { id: 'usr-resident', email: 'resident@gmail.com', fullName: 'Maria Santos [DEMO DATA]', phone: '+639201112222', role: 'RESIDENT', barangayId: 'brgy-1', barangayName: 'Monbon [DEMO DATA]', status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">User Role Management</h2>
        <p className="text-sm text-slate-400 mt-1">View registered users and their access roles in the system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        {[['MDRRMO Admins', users.filter(u => u.role === 'MDRRMO_ADMIN').length, 'Full administrative access'], ['Barangay Officials', users.filter(u => u.role === 'BARANGAY_OFFICIAL').length, 'Limited ground-level reporting'], ['Residents', users.filter(u => u.role === 'RESIDENT').length, 'View-only + disaster reports']].map(([label, count, desc]) => (
          <div key={label as string} className="glass-panel p-4 flex items-center gap-3">
            <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><Users className="w-6 h-6" /></div>
            <div><p className="text-2xl font-black text-slate-100">{count}</p><p className="text-xs font-bold text-slate-200">{label}</p><p className="text-[11px] text-slate-400">{desc}</p></div>
          </div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead><tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold"><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Barangay</th><th className="p-4">Phone</th><th className="p-4">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-900/50 transition">
                <td className="p-4"><p className="font-bold text-slate-200">{u.fullName}</p>{u.isDemo && <DemoBadge />}</td>
                <td className="p-4 text-slate-400">{u.email}</td>
                <td className="p-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${roleColors[u.role]}`}>{u.role.replace('_', ' ')}</span></td>
                <td className="p-4 text-slate-400 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{u.barangayName}</td>
                <td className="p-4 text-slate-400">{u.phone}</td>
                <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'}`}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

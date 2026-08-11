import React from 'react';
import { LogOut, User as UserIcon, ShieldAlert, Radio } from 'lucide-react';
import { DemoBadge } from '../Common/DemoBadge';
import { User } from '../../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Command Operations Live</span>
        </div>
        <DemoBadge label="IROSIN SORSOGON DEMO MODE" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-xl">
          <div className="w-7 h-7 bg-sky-500/20 text-sky-400 rounded-lg flex items-center justify-center font-bold text-xs">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="text-left leading-tight">
            <p className="text-xs font-bold text-slate-200">{user?.fullName || 'MDRRMO Admin'}</p>
            <p className="text-[10px] text-sky-400 font-medium">{user?.role || 'MDRRMO_ADMIN'}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition border border-transparent hover:border-red-500/30"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

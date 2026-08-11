import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Flame,
  Home,
  Navigation,
  BookOpen,
  PhoneCall,
  BellRing,
  Send,
  FileSpreadsheet,
  FileText,
  Users,
  ShieldCheck,
  Settings,
  ShieldAlert
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/barangays', label: 'Barangays', icon: MapPin },
  { path: '/hazard-zones', label: 'Hazard Zones', icon: Flame },
  { path: '/evacuation-centers', label: 'Evacuation Centers', icon: Home },
  { path: '/evacuation-routes', label: 'Evacuation Routes', icon: Navigation },
  { path: '/preparedness', label: 'Preparedness Guides', icon: BookOpen },
  { path: '/emergency-contacts', label: 'Emergency Contacts', icon: PhoneCall },
  { path: '/alerts', label: 'Alert Composer', icon: BellRing },
  { path: '/notifications', label: 'Notification Logs', icon: Send },
  { path: '/disaster-reports', label: 'Disaster Reports', icon: FileSpreadsheet },
  { path: '/reports', label: 'Analytics & Export', icon: FileText },
  { path: '/users', label: 'User Roles', icon: Users },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { path: '/settings', label: 'Settings & Status', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col justify-between p-4 z-20 shrink-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4 border-b border-slate-800">
          <div className="p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-sky-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-100 tracking-tight leading-tight">MDRRMO Irosin</h1>
            <p className="text-[11px] text-slate-400 font-medium">Disaster Safety Command</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-180px)] pr-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* LGU/MDRRMO Footer Note */}
      <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-center">
        <p className="text-[11px] font-semibold text-slate-400">LGU Irosin, Sorsogon</p>
        <p className="text-[10px] text-slate-500">MDRRMO System v1.0</p>
      </div>
    </aside>
  );
};

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Home,
  BookOpen,
  PhoneCall,
  BellRing,
  Send,
  FileSpreadsheet,
  Megaphone,
  FileText,
  Users,
  ShieldCheck,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/barangays', label: 'Barangays', icon: MapPin },
  { path: '/evacuation-centers', label: 'Evacuation Centers', icon: Home },
  { path: '/preparedness', label: 'Preparedness Guides', icon: BookOpen },
  { path: '/emergency-contacts', label: 'Emergency Contacts', icon: PhoneCall },
  { path: '/alerts', label: 'Alert Composer', icon: BellRing },
  { path: '/notifications', label: 'Notification Logs', icon: Send },
  { path: '/disaster-reports', label: 'Disaster Reports', icon: FileSpreadsheet },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/reports', label: 'Analytics & Export', icon: FileText },
  { path: '/users', label: 'User Roles & Security', icon: Users },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { path: '/settings', label: 'Settings & Status', icon: Settings },
];

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen = false,
  onCloseMobileMenu,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('irosin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('irosin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleNavClick = () => {
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900/98 backdrop-blur-xl border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-auto lg:h-screen lg:sticky lg:top-0 lg:shadow-none
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        flex flex-col justify-between p-3.5 shrink-0
      `}
    >
      <div>
        {/* Brand Header & Toggle Button */}
        <div className={`flex items-center ${isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'} pb-3 mb-3 border-b border-slate-800/80`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 rounded-xl text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <h1 className="font-black text-sm text-slate-100 tracking-tight leading-tight truncate">
                MDRRMO Irosin
              </h1>
              <p className="text-[10.5px] text-sky-400 font-bold uppercase tracking-wider truncate">
                Disaster Command
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Toggle Expand / Collapse Button */}
            {!isCollapsed && (
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 border border-slate-800 transition"
                title="I-collapse ang Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobileMenu}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition border border-slate-800"
              title="Isara ang Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsed Expand Quick Button (Desktop only) */}
        {isCollapsed && (
          <div className="hidden lg:flex justify-center mb-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl text-sky-400 hover:text-sky-300 hover:bg-slate-800/80 border border-sky-500/30 transition shadow-sm"
              title="I-expand ang Sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-170px)] pr-0.5 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'gap-3 px-3'} py-2.5 rounded-xl text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 font-bold shadow-md shadow-sky-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition group-hover:scale-110" />
                <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* LGU/MDRRMO Footer Note */}
      <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-center overflow-hidden">
        <div className={isCollapsed ? 'lg:hidden' : 'block'}>
          <p className="text-[11px] font-bold text-slate-300 tracking-wide">LGU Irosin, Sorsogon</p>
          <p className="text-[10px] text-sky-400/80 font-medium">MDRRMO System v1.0</p>
        </div>
        {isCollapsed && (
          <div className="hidden lg:block text-[9px] font-black text-sky-400 font-mono tracking-tighter">
            v1.0
          </div>
        )}
      </div>
    </aside>
  );
};

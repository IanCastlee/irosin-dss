import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ScrollText,
  X,
} from 'lucide-react';
import { brandingService, AdminBranding, DEFAULT_BRANDING } from '../../services/brandingService';

const primaryNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/barangays', label: 'Barangays', icon: MapPin },
  { path: '/evacuation-centers', label: 'Evacuation Centers', icon: Home },
  { path: '/preparedness', label: 'Preparedness Guides', icon: BookOpen },
  { path: '/emergency-contacts', label: 'Emergency Contacts', icon: PhoneCall },
  { path: '/alerts', label: 'Alert Composer', icon: BellRing },
  { path: '/disaster-reports', label: 'Disaster Reports', icon: FileSpreadsheet },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/reports', label: 'Analytics & Export', icon: FileText },
  { path: '/users', label: 'User Roles & Security', icon: Users },
  { path: '/settings', label: 'Settings & Status', icon: Settings },
];

const logItems = [
  { path: '/notifications', label: 'Notification Logs', icon: Send },
  { path: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
];

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  isCollapsed?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen = false,
  isCollapsed = false,
  onCloseMobileMenu,
}) => {
  const location = useLocation();
  const [branding, setBranding] = useState<AdminBranding>(DEFAULT_BRANDING);

  const isLogsRoute = location.pathname === '/notifications' || location.pathname === '/audit-logs';
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  useEffect(() => {
    const unsub = brandingService.subscribe((b) => setBranding(b));
    return unsub;
  }, []);

  const handleNavClick = () => {
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900/98 backdrop-blur-xl border-r border-slate-800/80 shadow-xl transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-auto lg:h-screen lg:sticky lg:top-0 lg:shadow-none
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        flex flex-col justify-between p-3.5 shrink-0
      `}
    >
      <div>
        {/* Brand Header */}
        <div className={`flex items-center ${isCollapsed ? 'lg:justify-center justify-between' : 'justify-between'} pb-3 mb-3 border-b border-slate-800/60`}>
          <div className="flex items-center gap-3 overflow-hidden">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo"
                className="w-10 h-10 rounded object-contain bg-slate-950 p-1 shrink-0 shadow-md shadow-sky-500/10"
              />
            ) : (
              <div className="p-2.5 bg-gradient-to-br from-sky-500/20 to-blue-600/20 rounded text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
                <ShieldAlert className="w-5 h-5" />
              </div>
            )}
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              <h1 className="font-extrabold text-sm text-slate-100 tracking-tight leading-tight truncate">
                {branding.orgName || 'MDRRMO Irosin'}
              </h1>
              <p className="text-[10.5px] text-sky-400 font-bold uppercase tracking-wider truncate">
                {branding.orgSubtitle || 'Disaster Command'}
              </p>
            </div>
          </div>

          {/* Mobile Close Button only */}
          <button
            onClick={onCloseMobileMenu}
            className="lg:hidden p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title="Isara ang Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-170px)] pr-0.5 custom-scrollbar">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0 px-3' : 'gap-3 px-3'} py-2.5 rounded text-xs font-semibold transition group ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border-0 border-none font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-0 border-none'
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

          {/* Logs & Audits Dropdown Section at the Bottom */}
          <div className="pt-1.5 mt-1.5 border-t border-slate-800/60">
            {isCollapsed ? (
              // Collapsed Mode: show log icons directly with tooltips
              <div className="space-y-1">
                {logItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={handleNavClick}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex items-center lg:justify-center lg:px-0 py-2.5 rounded text-xs font-semibold transition group ${
                          isActive
                            ? 'bg-sky-500/15 text-sky-400 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 transition group-hover:scale-110" />
                    </NavLink>
                  );
                })}
              </div>
            ) : (
              // Expanded Mode: Collapsible Dropdown
              <div>
                <button
                  type="button"
                  onClick={() => setIsLogsOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-semibold transition group cursor-pointer ${
                    isLogsRoute
                      ? 'bg-sky-500/10 text-sky-400 font-bold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ScrollText className="w-4 h-4 shrink-0 text-sky-400 transition group-hover:scale-110" />
                    <span className="truncate">System Logs & History</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                      isLogsOpen ? 'rotate-180 text-sky-400' : 'text-slate-500'
                    }`}
                  />
                </button>

                {/* Dropdown Items */}
                {isLogsOpen && (
                  <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-sky-500/30 ml-4 mt-1">
                    {logItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={handleNavClick}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-semibold transition ${
                              isActive
                                ? 'bg-sky-500/15 text-sky-400 font-bold shadow-sm'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                            }`
                          }
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* LGU/MDRRMO Footer Note */}
      <div className="p-2.5 bg-slate-950/70 border-0 border-none rounded text-center overflow-hidden">
        <div className={isCollapsed ? 'lg:hidden' : 'block'}>
          <p className="text-[11px] font-bold text-slate-300 tracking-wide">
            {branding.municipality}, {branding.province}
          </p>
          <p className="text-[10px] text-sky-400/80 font-medium">
            {branding.systemTag || 'MDRRMO System v2.0'}
          </p>
        </div>
        {isCollapsed && (
          <div className="hidden lg:block text-[9px] font-black text-sky-400 font-mono tracking-tighter">
            v2.0
          </div>
        )}
      </div>
    </aside>
  );
};

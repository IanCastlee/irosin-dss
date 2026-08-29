import React, { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Radio, Bell, BellRing, Menu } from 'lucide-react';
import { User } from '../../types';
import { adminNotificationService } from '../../services/adminNotificationService';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onToggleSidebar }) => {
  const [notifState, setNotifState] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifState(Notification.permission);
    }
  }, []);

  const handleToggleNotif = async () => {
    const perm = await adminNotificationService.requestPermission();
    if (perm !== 'unsupported') {
      setNotifState(perm);
      if (perm === 'granted') {
        await adminNotificationService.subscribeToWebPush();
        adminNotificationService.triggerSystemNotification({
          title: '🔔 Push Notifications Aktibo!',
          body: 'Makakatanggap ka na ng instant system alert sa laptop/PC o phone kahit nakasara o naka-minimize ang browser tab.',
          url: '/disaster-reports'
        });
      }
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-slate-900/95 backdrop-blur-md border-0 border-none px-2.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors shadow-sm">
      {/* Left side: Hamburger Toggle Button (Desktop & Mobile) + Live Indicator */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Universal Burger Menu Button to Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center p-2 rounded text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition shadow-sm shrink-0 border-0 border-none cursor-pointer"
          title="I-toggle ang Sidebar"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 truncate">
            <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] sm:text-xs font-bold text-slate-300 tracking-wide uppercase truncate hidden xs:inline-block sm:inline-block">
              Command Live
            </span>
          </div>
        </div>
      </div>

      {/* Right side: Push Notification, User Profile & Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Push Notification Toggle */}
        <button
          onClick={handleToggleNotif}
          className={`flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded border-0 border-none text-[10.5px] sm:text-xs font-bold transition ${
            notifState === 'granted'
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 animate-pulse'
          }`}
          title={notifState === 'granted' ? 'Push Notifications Active (Pindutin para mag-test)' : 'I-enable ang System Push Notifications'}
        >
          {notifState === 'granted' ? <BellRing className="w-3.5 h-3.5 shrink-0" /> : <Bell className="w-3.5 h-3.5 shrink-0" />}
          <span className="hidden sm:inline">{notifState === 'granted' ? 'Push Active' : 'Enable Push'}</span>
        </button>

        {/* User Profile Capsule */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-800/80 border-0 border-none rounded">
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-sky-500/20 text-sky-400 rounded flex items-center justify-center font-bold text-xs shrink-0">
            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="text-left leading-tight hidden md:block">
            <p className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{user?.fullName || 'MDRRMO Admin'}</p>
            <p className="text-[9.5px] text-sky-400 font-medium truncate">{user?.role || 'MDRRMO_ADMIN'}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-1.5 sm:p-2 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition border-0 border-none shrink-0"
          title="Logout"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </header>
  );
};

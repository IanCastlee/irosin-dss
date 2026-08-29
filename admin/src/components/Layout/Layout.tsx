import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { User } from '../../types';

interface LayoutProps {
  user: User | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ user, onLogout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('irosin_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setIsCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('irosin_sidebar_collapsed', String(next));
        return next;
      });
    } else {
      setIsMobileMenuOpen(prev => !prev);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 relative">
      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        isCollapsed={isCollapsed}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Navbar
          user={user}
          onLogout={onLogout}
          onToggleSidebar={handleToggleSidebar}
        />
        <main className="p-3.5 sm:p-5 md:p-6 flex-1 overflow-x-hidden w-full max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
};

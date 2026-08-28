import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Barangays } from './pages/Barangays';
import { EvacuationCenters } from './pages/EvacuationCenters';
import { PreparednessGuides } from './pages/PreparednessGuides';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { AlertComposer } from './pages/AlertComposer';
import { NotificationLogs } from './pages/NotificationLogs';
import { DisasterReports } from './pages/DisasterReports';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { Reports } from './pages/Reports';
import { UsersPage } from './pages/UsersPage';
import { AuditLogs } from './pages/AuditLogs';
import { SettingsPage } from './pages/SettingsPage';
import { User } from './types';
import { adminNotificationService } from './services/adminNotificationService';
import { Api, isTokenExpired } from './services/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | undefined>(undefined);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('irosin_admin_token');
    localStorage.removeItem('irosin_admin_user');
    adminNotificationService.destroy();
    setUser(null);
  }, []);

  const handleSessionExpired = useCallback((message: string) => {
    handleLogout();
    setSessionExpiredMessage(message);
  }, [handleLogout]);

  useEffect(() => {
    const token = localStorage.getItem('irosin_admin_token');
    const stored = localStorage.getItem('irosin_admin_user');

    if (token && stored) {
      if (isTokenExpired(token)) {
        handleSessionExpired('Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.');
        setIsLoading(false);
        return;
      }

      try {
        const u = JSON.parse(stored);
        setUser(u);
        adminNotificationService.init();

        // Proactively verify token status on backend
        Api.getMe().catch((err: any) => {
          console.warn('[App] Session verification failed:', err);
          handleSessionExpired('Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.');
        });
      } catch {
        handleLogout();
      }
    } else {
      handleLogout();
    }
    setIsLoading(false);
  }, [handleLogout, handleSessionExpired]);

  // Periodic and Focus-based Token Expiration Monitor
  useEffect(() => {
    const onSessionExpiredEvent = (e: any) => {
      const msg = e?.detail?.message || 'Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.';
      handleSessionExpired(msg);
    };

    window.addEventListener('auth:session-expired', onSessionExpiredEvent);

    // Proactively check every 15 seconds if token has expired
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('irosin_admin_token');
      if (currentToken && isTokenExpired(currentToken)) {
        handleSessionExpired('Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.');
      }
    }, 15000);

    // Check immediately when user switches back to browser tab
    const onFocus = () => {
      const currentToken = localStorage.getItem('irosin_admin_token');
      if (currentToken && isTokenExpired(currentToken)) {
        handleSessionExpired('Ang iyong session ay nag-expire na. Mangyaring mag-log in muli.');
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('auth:session-expired', onSessionExpiredEvent);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [handleSessionExpired]);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    setSessionExpiredMessage(undefined);
    localStorage.setItem('irosin_admin_token', token);
    localStorage.setItem('irosin_admin_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    adminNotificationService.init();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-sky-400 font-semibold animate-pulse">Loading MDRRMO System...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} sessionExpiredMessage={sessionExpiredMessage} />;
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/barangays" element={<Barangays />} />
          <Route path="/evacuation-centers" element={<EvacuationCenters />} />
          <Route path="/preparedness" element={<PreparednessGuides />} />
          <Route path="/emergency-contacts" element={<EmergencyContacts />} />
          <Route path="/alerts" element={<AlertComposer />} />
          <Route path="/notifications" element={<NotificationLogs />} />
          <Route path="/disaster-reports" element={<DisasterReports />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;

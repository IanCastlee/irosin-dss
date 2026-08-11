import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Barangays } from './pages/Barangays';
import { HazardZones } from './pages/HazardZones';
import { EvacuationCenters } from './pages/EvacuationCenters';
import { EvacuationRoutes } from './pages/EvacuationRoutes';
import { PreparednessGuides } from './pages/PreparednessGuides';
import { EmergencyContacts } from './pages/EmergencyContacts';
import { AlertComposer } from './pages/AlertComposer';
import { NotificationLogs } from './pages/NotificationLogs';
import { DisasterReports } from './pages/DisasterReports';
import { Reports } from './pages/Reports';
import { UsersPage } from './pages/UsersPage';
import { AuditLogs } from './pages/AuditLogs';
import { SettingsPage } from './pages/SettingsPage';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('irosin_admin_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    localStorage.setItem('irosin_admin_token', token);
    localStorage.setItem('irosin_admin_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('irosin_admin_token');
    localStorage.removeItem('irosin_admin_user');
    setUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-sky-400 font-semibold animate-pulse">Loading MDRRMO System...</div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/barangays" element={<Barangays />} />
          <Route path="/hazard-zones" element={<HazardZones />} />
          <Route path="/evacuation-centers" element={<EvacuationCenters />} />
          <Route path="/evacuation-routes" element={<EvacuationRoutes />} />
          <Route path="/preparedness" element={<PreparednessGuides />} />
          <Route path="/emergency-contacts" element={<EmergencyContacts />} />
          <Route path="/alerts" element={<AlertComposer />} />
          <Route path="/notifications" element={<NotificationLogs />} />
          <Route path="/disaster-reports" element={<DisasterReports />} />
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

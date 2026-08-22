import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Home,
  Flame,
  BellRing,
  Users,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Api } from '../services/api';
import { DisasterAlert, EvacuationCenter, DisasterReport } from '../types';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../components/Common/LoadingSpinner';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({
    totalBarangays: 0,
    totalCenters: 0,
    openCenters: 0,
    totalCapacity: 0,
    currentOccupancy: 0,
    activeHazardZones: 0,
    activeAlerts: 0,
    totalResidents: 0,
    pendingReports: 0
  });
  const [activeAlerts, setActiveAlerts] = useState<DisasterAlert[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [emergencyStatus, setEmergencyStatus] = useState<'NORMAL' | 'ADVISORY' | 'WARNING' | 'EVACUATION ORDER'>('ADVISORY');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, alertRes, centerRes, reportRes] = await Promise.allSettled([
        Api.getSummary(),
        Api.getAlerts(),
        Api.getCenters(),
        Api.getDisasterReports()
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.summary || {});
      if (alertRes.status === 'fulfilled') setActiveAlerts((alertRes.value.alerts || []).filter((a: any) => a.status === 'ACTIVE'));
      if (centerRes.status === 'fulfilled') setCenters(centerRes.value.evacuationCenters || []);
      if (reportRes.status === 'fulfilled') setReports(reportRes.value.disasterReports || []);
    } catch (err) {
      console.warn('Dashboard load warning:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ADVISORY': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'WARNING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'EVACUATION ORDER': return 'bg-red-500/30 text-red-300 border-red-500/50 animate-pulse';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  if (loading) {
    return <LoadingSpinner size="fullscreen" message="Synchronizing Live Command Dashboard with Cloud Firestore..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Emergency Status Banner */}
      <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition ${getStatusColor(emergencyStatus)}`}>
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/10 shrink-0">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">MUNICIPAL EMERGENCY STATUS: {emergencyStatus}</h2>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Location: Selected Barangays in Irosin, Sorsogon (Monbon, San Agustin, Gabao, San Julian, Buenavista)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 mr-2">Set Status:</span>
          {(['NORMAL', 'ADVISORY', 'WARNING', 'EVACUATION ORDER'] as const).map(status => (
            <button
              key={status}
              onClick={() => setEmergencyStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                emergencyStatus === status ? 'bg-white text-slate-950 border-white shadow-md' : 'bg-slate-900/60 hover:bg-slate-900 border-white/10 text-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Barangays</span>
            <MapPin className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-3xl font-black text-slate-100">{summary.totalBarangays}</p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Monitored by MDRRMO
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Evacuation Centers</span>
            <Home className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-100">{summary.openCenters}</p>
            <span className="text-xs text-slate-400 font-medium">/ {summary.totalCenters} Open</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.round((summary.currentOccupancy / (summary.totalCapacity || 1)) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 flex justify-between">
            <span>Occupancy: {summary.currentOccupancy}</span>
            <span>Capacity: {summary.totalCapacity}</span>
          </p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Road & Hazard Reports</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">{summary.verifiedReports || 0}</p>
          <p className="text-[11px] text-slate-400">Active Road Conditions & Incidents</p>
        </div>

        <div className="glass-panel p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Citizen Reports</span>
            <FileSpreadsheet className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-black text-rose-400">{summary.pendingReports}</p>
          <Link to="/disaster-reports" className="text-[11px] text-sky-400 font-semibold hover:underline flex items-center gap-0.5">
            Review Reports <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Main Content Grid: Active Alerts & Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Emergency Announcements */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-slate-100">Official Active Announcements & Alerts</h3>
              </div>
              <Link to="/alerts" className="text-xs text-sky-400 font-bold hover:underline flex items-center gap-1">
                Compose New Alert <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-300">No active emergency warnings at this moment.</p>
                <p className="text-xs">Regular disaster readiness operations ongoing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {alert.alertLevel}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(alert.startTime).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-100">{alert.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                    <div className="p-2.5 bg-slate-900 rounded-lg text-xs border border-slate-800 text-sky-300 font-medium">
                      <strong>Recommended Action:</strong> {alert.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Evacuation Centers Table */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Live Evacuation Centers Status</h3>
              <Link to="/evacuation-centers" className="text-xs text-sky-400 font-bold hover:underline">
                Manage All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Center Name</th>
                    <th className="py-2.5">Barangay</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Occupancy / Capacity</th>
                    <th className="py-2.5">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {centers.map(center => (
                    <tr key={center.id} className="hover:bg-slate-800/40">
                      <td className="py-3 text-slate-200 font-bold">{center.name}</td>
                      <td className="py-3 text-slate-400">{center.barangayName}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {center.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">
                        {center.currentOccupancy || 0} / {center.capacity || 1} ({Math.round(((center.currentOccupancy || 0) / (center.capacity || 1)) * 100)}%)
                      </td>
                      <td className="py-3 text-slate-400">{center.contactPhone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Interactive Map Simulation Box */}
        <div className="space-y-4">
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100">Irosin Command Map Preview</h3>
            </div>

            <div className="relative w-full h-72 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Simulated Map Markers */}
              <div className="relative z-10 space-y-3">
                <div className="p-3 bg-slate-900/90 border border-sky-500/40 rounded-xl shadow-xl space-y-1 text-left">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Coordinates: 12.7042° N, 124.0371° E</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Target Area: Barangay Monbon & San Agustin</p>
                  <p className="text-[10px] text-slate-400">Cadacan River Sector</p>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Road Hazards Monitored
                  </span>
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded font-semibold flex items-center gap-1">
                    <Home className="w-3 h-3" /> 5 Centers
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-400">
              <p className="font-bold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Official Route Routing Active
              </p>
              <p>Verified MDRRMO safe routes take precedence over commercial map suggestions during disasters.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

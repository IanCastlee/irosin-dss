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

  if (loading) {
    return <LoadingSpinner size="fullscreen" message="Synchronizing Live Command Dashboard with Cloud Firestore..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-panel p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Barangays</span>
            <MapPin className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-100">{summary.totalBarangays}</p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Monitored by MDRRMO
          </p>
        </div>

        <div className="glass-panel p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Evacuation Centers</span>
            <Home className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-100">{summary.openCenters}</p>
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

        <div className="glass-panel p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Reports</span>
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400">{summary.verifiedReports || 0}</p>
          <p className="text-[11px] text-slate-400">Active Road Conditions & Incidents</p>
        </div>

        <div className="glass-panel p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Citizen Reports</span>
            <FileSpreadsheet className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-rose-400">{summary.pendingReports}</p>
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
                  <div key={alert.id} className="p-4 rounded bg-slate-950/40 border border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {alert.alertLevel}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" /> {new Date(alert.startTime).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-100 text-sm sm:text-base leading-tight">{alert.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.message}</p>
                    <div className="p-2.5 bg-slate-900/80 rounded text-xs border border-slate-800/80 text-sky-400 font-medium">
                      <strong className="text-slate-200">Recommended Action:</strong> {alert.recommendedAction}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Evacuation Centers Table */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h3 className="text-base font-bold text-slate-100">Live Evacuation Centers Status</h3>
              <Link to="/evacuation-centers" className="text-xs text-sky-400 font-bold hover:underline">
                Manage All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-400 uppercase font-semibold">
                    <th className="py-2.5">Center Name</th>
                    <th className="py-2.5">Barangay</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Occupancy / Capacity</th>
                    <th className="py-2.5">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-medium">
                  {centers.map(center => (
                    <tr key={center.id} className="hover:bg-slate-800/20">
                      <td className="py-3 text-slate-200 font-bold">{center.name}</td>
                      <td className="py-3 text-slate-400">{center.barangayName}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {center.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300 font-mono">
                        {center.currentOccupancy || 0} / {center.capacity || 1} ({Math.round(((center.currentOccupancy || 0) / (center.capacity || 1)) * 100)}%)
                      </td>
                      <td className="py-3 text-slate-400 font-mono">{center.contactPhone}</td>
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
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
              <h3 className="text-base font-bold text-slate-100">Irosin Command Map Preview</h3>
            </div>

            <div className="relative w-full h-72 bg-slate-950/40 rounded border border-slate-800/60 overflow-hidden flex flex-col items-center justify-center p-4 text-center">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]"></div>
              
              {/* Simulated Map Markers */}
              <div className="relative z-10 space-y-3 max-w-xs">
                <div className="p-3 bg-slate-900/90 rounded border border-sky-500/30 shadow-lg text-left text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <MapPin className="w-3.5 h-3.5" /> Coordinates: 12.7042° N, 124.0371° E
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Target Area: <span className="font-semibold text-slate-200">Barangay Monbon & San Agustin</span>
                  </p>
                  <p className="text-[10px] text-slate-400 italic">Cadacan River Sector</p>
                </div>

                <div className="flex justify-center gap-2 text-[10.5px]">
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Road Hazards Monitored
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <Home className="w-3 h-3" /> {summary.totalCenters} Centers
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Official Route Routing Active
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                Verified MDRRMO safe routes take precedence over commercial map suggestions during disasters.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

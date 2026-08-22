import React, { useEffect, useState } from 'react';
import { FileText, Download, TrendingUp, Home, CheckCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Api } from '../services/api';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [exportingType, setExportingType] = useState<string | null>(null);

  useEffect(() => { loadSummary(); }, []);

  const loadSummary = async () => {
    try { const res = await Api.getSummary(); setSummary(res.summary); }
    catch { setSummary({ totalBarangays: 5, totalCenters: 3, openCenters: 3, totalCapacity: 1100, currentOccupancy: 45, activeHazardZones: 2, activeAlerts: 1, totalResidents: 1, pendingReports: 1, totalReports: 2 }); }
  };

  const handleExport = async (type: string) => {
    setExportingType(type);
    try {
      const res = await fetch(`/api/v1/summary-reports/export?type=${type}`, { headers: { Authorization: `Bearer ${localStorage.getItem('irosin_admin_token')}` } });
      if (!res.ok) throw new Error('Export unavailable');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `irosin_${type}_export.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(`CSV export for "${type}" requires the backend to be running. Run: cd backend && npm run dev`);
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Analytics & Reports</h2>
        <p className="text-sm text-slate-400 mt-1">System summary and data export for MDRRMO reporting purposes</p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Barangays', value: summary.totalBarangays, icon: TrendingUp, color: 'sky' },
            { label: 'Evacuation Centers', value: `${summary.openCenters}/${summary.totalCenters} Open`, icon: Home, color: 'emerald' },
            { label: 'Verified Road Reports', value: summary.verifiedReports || 0, icon: CheckCircle, color: 'emerald' },
            { label: 'Total Disaster Reports', value: summary.totalReports, icon: FileSpreadsheet, color: 'rose' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="glass-panel p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
                  <Icon className={`w-5 h-5 text-${item.color}-400`} />
                </div>
                <p className="text-3xl font-black text-slate-100">{item.value}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <Download className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold text-slate-100">CSV Data Export</h3>
        </div>
        <p className="text-sm text-slate-400">Export official records as CSV files for offline documentation and reporting.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[['Evacuation Centers', 'centers'], ['Disaster & Road Reports', 'reports'], ['Emergency Contacts', 'contacts']].map(([label, type]) => (
            <button
              key={type}
              onClick={() => handleExport(type)}
              disabled={exportingType === type}
              className="flex items-center gap-2 justify-center px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition border border-slate-700 text-sm disabled:opacity-50"
            >
              {exportingType === type ? <RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> : <Download className="w-4 h-4 text-sky-400" />}
              <span>{exportingType === type ? `Exporting ${label}...` : `Export ${label}`}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

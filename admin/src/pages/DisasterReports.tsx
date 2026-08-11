import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, CheckCircle, XCircle, Clock, AlertTriangle, Eye } from 'lucide-react';
import { Api } from '../services/api';
import { DisasterReport } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  VERIFIED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  RESOLVED: 'bg-slate-700 text-slate-400 border-slate-600',
};

const reportTypeIcons: Record<string, string> = {
  FLOODING: '🌊', BLOCKED_ROAD: '🚧', DAMAGED_ROAD: '🛣️', LANDSLIDE: '⛰️', DAMAGED_EVACUATION_CENTER: '🏚️', UNSAFE_ROUTE: '⚠️', OTHER: '📋'
};

export const DisasterReports: React.FC = () => {
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [selected, setSelected] = useState<DisasterReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'RESOLVED' | 'REJECTED'>('ALL');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try { const res = await Api.getDisasterReports(); setReports(res.disasterReports); }
    catch { setDemoData(); }
  };

  const setDemoData = () => setReports([
    { id: 'rep-1', reportType: 'FLOODING', description: 'Water level reached ankle height along Sitio Riverbank road near Monbon bridge.', latitude: 12.7078, longitude: 124.032, locationDescription: 'Monbon Bridge, Barangay Monbon', barangayId: 'brgy-1', barangayName: 'Monbon', reportedBy: 'usr-official', reporterName: 'Capt. Juan Dela Cruz [DEMO DATA]', reporterPhone: '+63918987654', reporterRole: 'BARANGAY_OFFICIAL', status: 'VERIFIED', adminNotes: 'Field inspection completed by MDRRMO Team Alpha.', createdAt: new Date().toISOString(), isDemo: true },
    { id: 'rep-2', reportType: 'BLOCKED_ROAD', description: 'Fallen tree blocking the concrete road leading to Brgy Gabao Zone 4.', latitude: 12.722, longitude: 124.019, locationDescription: 'Gabao Zone 4 Access Road', barangayId: 'brgy-3', barangayName: 'Gabao', reportedBy: 'usr-resident', reporterName: 'Maria Santos [DEMO DATA]', reporterPhone: '+63920111222', reporterRole: 'RESIDENT', status: 'PENDING', createdAt: new Date().toISOString(), isDemo: true },
  ]);

  const handleUpdateStatus = async (status: string) => {
    if (!selected) return;
    try {
      const res = await Api.updateReportStatus(selected.id, status, adminNotes);
      setReports(prev => prev.map(r => r.id === selected.id ? res.disasterReport : r));
    } catch {
      setReports(prev => prev.map(r => r.id === selected.id ? { ...r, status: status as any, adminNotes } : r));
    }
    setSelected(null);
    setAdminNotes('');
  };

  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Disaster Reports</h2>
          <p className="text-sm text-slate-400 mt-1">Citizen-submitted reports — must be verified by MDRRMO before being acted upon</p>
        </div>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-sm text-amber-300">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div><strong>Verification Required:</strong> Citizen-submitted reports are NOT automatically official information. MDRRMO personnel must verify each report before taking official action.</div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'VERIFIED', 'RESOLVED', 'REJECTED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${filter === f ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" /><p>No reports to show.</p></div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="glass-panel p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">{reportTypeIcons[r.reportType]}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded">{r.reportType.replace('_', ' ')}</span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${statusColors[r.status]}`}>{r.status}</span>
                      {r.isDemo && <DemoBadge />}
                    </div>
                    <p className="text-sm text-slate-100 font-semibold">{r.description}</p>
                    <p className="text-xs text-slate-400 mt-1">📍 {r.locationDescription} • {r.barangayName}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(r); setAdminNotes(r.adminNotes || ''); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition shrink-0">
                  <Eye className="w-3.5 h-3.5" /> Review
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-800 pt-2">
                <span>Reported by: <strong className="text-slate-300">{r.reporterName}</strong> ({r.reporterRole})</span>
                <span>{r.reporterPhone}</span>
                <span className="ml-auto flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Review: ${selected?.reportType.replace('_', ' ')}`}>
        {selected && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <p className="text-sm font-bold text-slate-100">{selected.description}</p>
              <p className="text-xs text-slate-400">Location: {selected.locationDescription} ({selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)})</p>
              <p className="text-xs text-slate-400">Reporter: {selected.reporterName} — {selected.reporterPhone} ({selected.reporterRole})</p>
              <p className="text-xs text-slate-400">Submitted: {new Date(selected.createdAt).toLocaleString()}</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${statusColors[selected.status]}`}>{selected.status}</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Admin Notes / Response</label>
              <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Document your verification findings or rejection reason..." className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" />
            </div>
            <p className="text-xs text-amber-400 font-medium">⚠ Only mark as VERIFIED after actual field verification or reliable confirmation.</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleUpdateStatus('VERIFIED')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition"><CheckCircle className="w-3.5 h-3.5" /> Mark Verified</button>
              <button onClick={() => handleUpdateStatus('RESOLVED')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold transition"><CheckCircle className="w-3.5 h-3.5" /> Mark Resolved</button>
              <button onClick={() => handleUpdateStatus('REJECTED')} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-900 hover:bg-rose-800 text-rose-200 text-xs font-bold transition"><XCircle className="w-3.5 h-3.5" /> Reject Report</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

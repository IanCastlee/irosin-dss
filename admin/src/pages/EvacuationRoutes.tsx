import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Navigation, AlertTriangle, CheckCircle, Clock, ShieldCheck } from 'lucide-react';
import { Api } from '../services/api';
import { EvacuationRoute } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TEMPORARILY_CLOSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNDER_REVIEW: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

export const EvacuationRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationRoute | null>(null);
  const [form, setForm] = useState({ routeName: '', originDescription: '', destinationCenterId: 'center-1', barangayId: 'brgy-1', waypoints: '[]', status: 'ACTIVE', instructions: '', hazardWarningsStr: '', distanceKm: 1.0, estimatedMinutes: 15 });

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    try { const res = await Api.getRoutes(); setRoutes(res.evacuationRoutes); }
    catch { setDemoData(); }
  };

  const setDemoData = () => setRoutes([
    { id: 'r-1', routeName: 'Monbon Riverbank → Irosin Central Gym [DEMO DATA]', originDescription: 'Monbon Barangay Hall & Riverbank Area', destinationCenterId: 'center-1', destinationCenterName: 'Irosin Central School Gymnasium', barangayId: 'brgy-1', barangayName: 'Monbon', waypoints: [{ lat: 12.7081, lng: 124.0325 }, { lat: 12.7038, lng: 124.0375 }], status: 'ACTIVE', instructions: 'Head EAST along elevated concrete bypass away from Cadacan River bank.', hazardWarnings: ['Avoid lower river bridge if water level reaches Alert Stage 2.'], distanceKm: 1.4, estimatedMinutes: 18, lastVerifiedDate: '2026-08-01', isDemo: true },
    { id: 'r-2', routeName: 'Gabao High Risk Sector → Covered Court [DEMO DATA]', originDescription: 'Gabao Zone 4 Hillsides', destinationCenterId: 'center-2', destinationCenterName: 'Gabao Multipurpose Covered Court', barangayId: 'brgy-3', barangayName: 'Gabao', waypoints: [{ lat: 12.723, lng: 124.018 }, { lat: 12.721, lng: 124.0208 }], status: 'ACTIVE', instructions: 'Walk SOUTH via established concrete barangay path.', hazardWarnings: ['Watch for slippery soil near hillside cut.'], distanceKm: 0.8, estimatedMinutes: 10, lastVerifiedDate: '2026-08-05', isDemo: true },
  ]);

  const openCreate = () => { setEditing(null); setForm({ routeName: '', originDescription: '', destinationCenterId: 'center-1', barangayId: 'brgy-1', waypoints: '[]', status: 'ACTIVE', instructions: '', hazardWarningsStr: '', distanceKm: 1.0, estimatedMinutes: 15 }); setIsModalOpen(true); };
  const openEdit = (r: EvacuationRoute) => { setEditing(r); setForm({ routeName: r.routeName, originDescription: r.originDescription, destinationCenterId: r.destinationCenterId, barangayId: r.barangayId, waypoints: JSON.stringify(r.waypoints), status: r.status, instructions: r.instructions, hazardWarningsStr: r.hazardWarnings.join('\n'), distanceKm: r.distanceKm, estimatedMinutes: r.estimatedMinutes }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let waypoints;
    try { waypoints = JSON.parse(form.waypoints); } catch { alert('Invalid waypoints JSON'); return; }
    const payload = { ...form, waypoints, hazardWarnings: form.hazardWarningsStr.split('\n').filter(Boolean) };
    delete (payload as any).hazardWarningsStr;
    try {
      if (editing) { const res = await Api.updateRoute(editing.id, payload); setRoutes(prev => prev.map(r => r.id === editing.id ? res.evacuationRoute : r)); }
      else { const res = await Api.createRoute(payload); setRoutes(prev => [...prev, res.evacuationRoute]); }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Evacuation Route Management</h2>
          <p className="text-sm text-slate-400 mt-1">Official MDRRMO-verified safe evacuation routes for Irosin, Sorsogon</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Route
        </button>
      </div>

      <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-start gap-3 text-sm text-sky-300">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div><strong>Official Route Policy:</strong> Only administrator-verified routes are labeled as safe evacuation routes. Google Maps general navigation will display a warning if no official route is defined for an area.</div>
      </div>

      <div className="space-y-4">
        {routes.map(r => (
          <div key={r.id} className="glass-panel p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><Navigation className="w-5 h-5" /></div>
                <div>
                  <p className="font-extrabold text-slate-100 leading-tight">{r.routeName}</p>
                  <p className="text-xs text-slate-400">{r.barangayName} → {r.destinationCenterName}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${statusColors[r.status]}`}>{r.status}</span>
                {r.isDemo && <DemoBadge />}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center"><p className="text-slate-400">Distance</p><p className="font-bold text-slate-200 text-base">{r.distanceKm} km</p></div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center"><p className="text-slate-400">Est. Time</p><p className="font-bold text-slate-200 text-base">{r.estimatedMinutes} min</p></div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center"><p className="text-slate-400">Waypoints</p><p className="font-bold text-slate-200 text-base">{r.waypoints.length}</p></div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300 uppercase">Instructions</p>
              <p className="text-xs text-slate-300 leading-relaxed">{r.instructions}</p>
            </div>

            {r.hazardWarnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Hazard Warnings</p>
                <ul className="space-y-0.5">{r.hazardWarnings.map((w, i) => <li key={i} className="text-xs text-amber-300/80">• {w}</li>)}</ul>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
              <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Last verified: {r.lastVerifiedDate}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(r)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => { if (confirm('Archive this route?')) setRoutes(prev => prev.filter(x => x.id !== r.id)); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition"><Trash2 className="w-3.5 h-3.5" /> Archive</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Evacuation Route' : 'Add Official Evacuation Route'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Route Name', 'routeName', 'text'], ['Origin Description', 'originDescription', 'text'], ['Destination Center ID', 'destinationCenterId', 'text'], ['Barangay ID', 'barangayId', 'text'], ['Distance (km)', 'distanceKm', 'number'], ['Estimated Time (minutes)', 'estimatedMinutes', 'number']].map(([label, key, type]) => (
            <div key={key}><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label><input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" /></div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
              {['ACTIVE', 'TEMPORARILY_CLOSED', 'UNDER_REVIEW'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Instructions</label><textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Hazard Warnings (one per line)</label><textarea value={form.hazardWarningsStr} onChange={e => setForm(p => ({ ...p, hazardWarningsStr: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Waypoints JSON (Array of {'{lat, lng}'})</label><textarea value={form.waypoints} onChange={e => setForm(p => ({ ...p, waypoints: e.target.value }))} rows={3} placeholder='[{"lat":12.7081,"lng":124.0325},{"lat":12.7038,"lng":124.0375}]' className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Create Route'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

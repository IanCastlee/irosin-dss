import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Navigation, AlertTriangle, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Api } from '../services/api';
import { EvacuationRoute } from '../types';
import { Modal } from '../components/Common/Modal';
import { CardSkeleton } from '../components/Common/LoadingSpinner';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TEMPORARILY_CLOSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNDER_REVIEW: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

export const EvacuationRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationRoute | null>(null);
  const [form, setForm] = useState({
    routeName: '', originDescription: '', destinationCenterId: 'center-1', barangayId: 'brgy-1',
    waypoints: '[]', status: 'ACTIVE', instructions: '', hazardWarningsStr: '',
    distanceKm: 1.0, estimatedMinutes: 15
  });

  useEffect(() => { loadRoutes(); }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const res = await Api.getRoutes();
      setRoutes(res.evacuationRoutes || []);
    } catch (err: any) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      routeName: '', originDescription: '', destinationCenterId: 'center-1', barangayId: 'brgy-1',
      waypoints: '[]', status: 'ACTIVE', instructions: '', hazardWarningsStr: '',
      distanceKm: 1.0, estimatedMinutes: 15
    });
    setIsModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    const warningsArr = Array.isArray(r.hazardWarnings) ? r.hazardWarnings : [];
    const waypointsVal = r.waypoints ? JSON.stringify(r.waypoints) : '[]';

    setForm({
      routeName: r.routeName || '',
      originDescription: r.originDescription || '',
      destinationCenterId: r.destinationCenterId || 'center-1',
      barangayId: r.barangayId || 'brgy-1',
      waypoints: waypointsVal,
      status: r.status || 'ACTIVE',
      instructions: r.instructions || (r.distance ? `${r.distance} • ${r.estimatedTime}` : ''),
      hazardWarningsStr: warningsArr.join('\n'),
      distanceKm: r.distanceKm || (r.distance ? parseFloat(r.distance) || 1.0 : 1.0),
      estimatedMinutes: r.estimatedMinutes || (r.estimatedTime ? parseInt(r.estimatedTime) || 10 : 10)
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let waypoints;
    try {
      waypoints = JSON.parse(form.waypoints);
    } catch {
      alert('Invalid waypoints JSON format');
      return;
    }

    const payload = {
      ...form,
      waypoints,
      hazardWarnings: form.hazardWarningsStr.split('\n').map(s => s.trim()).filter(Boolean)
    };
    delete (payload as any).hazardWarningsStr;

    setSaving(true);
    try {
      if (editing) {
        const res = await Api.updateRoute(editing.id, payload);
        setRoutes(prev => prev.map(r => r.id === editing.id ? res.evacuationRoute : r));
      } else {
        const res = await Api.createRoute(payload);
        setRoutes(prev => [...prev, res.evacuationRoute]);
      }
      setIsModalOpen(false);
    } catch {
      alert('Could not save. Check backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this evacuation route?')) return;
    setDeletingId(id);
    try {
      await Api.deleteRoute(id);
      setRoutes(prev => prev.filter(r => r.id !== id));
    } catch {
      alert('Delete failed.');
    } finally {
      setDeletingId(null);
    }
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
        <div><strong>Official Route Policy:</strong> Only administrator-verified routes are labeled as safe evacuation routes.</div>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : routes.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No evacuation routes registered. Click "+ Add Route" to map one.
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((r: any) => {
            const warnings = Array.isArray(r.hazardWarnings) ? r.hazardWarnings : [];
            const waypointsCount = Array.isArray(r.waypoints) ? r.waypoints.length : 0;
            const distDisplay = r.distanceKm ? `${r.distanceKm} km` : (r.distance || '1.5 km');
            const timeDisplay = r.estimatedMinutes ? `${r.estimatedMinutes} min` : (r.estimatedTime || '10 min');
            const instrDisplay = r.instructions || r.originDescription || 'Follow designated directional signage.';

            return (
              <div key={r.id} className="glass-panel p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><Navigation className="w-5 h-5" /></div>
                    <div>
                      <p className="font-extrabold text-slate-100 leading-tight">{r.routeName}</p>
                      <p className="text-xs text-slate-400">{r.barangayName || 'Irosin'} → {r.destinationCenterName || 'Evacuation Center'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${statusColors[r.status] || statusColors.ACTIVE}`}>
                      {r.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Distance</p>
                    <p className="font-bold text-slate-200 text-base">{distDisplay}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Est. Time</p>
                    <p className="font-bold text-slate-200 text-base">{timeDisplay}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Waypoints</p>
                    <p className="font-bold text-slate-200 text-base">{waypointsCount}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300 uppercase">Instructions / Details</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{instrDisplay}</p>
                </div>

                {warnings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Hazard Warnings</p>
                    <ul className="space-y-0.5">{warnings.map((w: string, i: number) => <li key={i} className="text-xs text-amber-300/80">• {w}</li>)}</ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Last verified: {r.lastVerifiedDate || 'Recent'}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(r)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                    >
                      {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Route' : 'Add Evacuation Route'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Route Name</label><input type="text" value={form.routeName} onChange={e => setForm(p => ({ ...p, routeName: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Origin / Start Location</label><input type="text" value={form.originDescription} onChange={e => setForm(p => ({ ...p, originDescription: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Distance (KM)</label><input type="number" step="0.1" value={form.distanceKm} onChange={e => setForm(p => ({ ...p, distanceKm: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
            <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Est. Minutes</label><input type="number" value={form.estimatedMinutes} onChange={e => setForm(p => ({ ...p, estimatedMinutes: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
          </div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Instructions</label><textarea value={form.instructions} onChange={e => setForm(p => ({ ...p, instructions: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Hazard Warnings (1 per line)</label><textarea value={form.hazardWarningsStr} onChange={e => setForm(p => ({ ...p, hazardWarningsStr: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editing ? 'Save Changes' : 'Create Route'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

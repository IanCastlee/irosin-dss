import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Flame, AlertTriangle } from 'lucide-react';
import { Api } from '../services/api';
import { HazardZone } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const severityColors: Record<string, string> = {
  LOW: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  CRITICAL: 'bg-red-600/30 text-red-300 border-red-500/50',
};

const hazardTypeColors: Record<string, string> = {
  FLOOD: 'bg-blue-500/20 text-blue-400',
  LANDSLIDE: 'bg-orange-500/20 text-orange-400',
  EARTHQUAKE: 'bg-purple-500/20 text-purple-400',
  VOLCANIC: 'bg-red-500/20 text-red-400',
  LAHAR: 'bg-rose-500/20 text-rose-400',
  TYPHOON: 'bg-cyan-500/20 text-cyan-400',
  OTHER: 'bg-slate-700 text-slate-400',
};

export const HazardZones: React.FC = () => {
  const [hazards, setHazards] = useState<HazardZone[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<HazardZone | null>(null);
  const [form, setForm] = useState({ name: '', hazardType: 'FLOOD', description: '', severity: 'MEDIUM', affectedBarangayIds: ['brgy-1'], source: 'MDRRMO Irosin Hazard Assessment', status: 'ACTIVE', coordinates: '[]' });

  useEffect(() => { loadHazards(); }, []);

  const loadHazards = async () => {
    try { const res = await Api.getHazards(); setHazards(res.hazardZones); }
    catch { setDemoData(); }
  };

  const setDemoData = () => setHazards([
    { id: 'h-1', name: 'Cadacan River High Flood Risk Zone [DEMO DATA]', hazardType: 'FLOOD', description: 'Low-lying riverbank zone subject to overflow.', severity: 'HIGH', affectedBarangayIds: ['brgy-1', 'brgy-2'], affectedBarangayNames: ['Monbon', 'San Agustin'], coordinates: [{ lat: 12.707, lng: 124.03 }, { lat: 12.71, lng: 124.032 }, { lat: 12.709, lng: 124.036 }, { lat: 12.705, lng: 124.034 }], source: 'MDRRMO Flood Hazard Mapping (2024)', status: 'ACTIVE', lastUpdated: new Date().toISOString(), isDemo: true },
    { id: 'h-2', name: 'Bulusan Volcano Extended Danger Zone [DEMO DATA]', hazardType: 'VOLCANIC', description: 'Volcanic ashfall and lahar channel hazards.', severity: 'CRITICAL', affectedBarangayIds: ['brgy-3', 'brgy-5'], affectedBarangayNames: ['Gabao', 'Buenavista'], coordinates: [{ lat: 12.725, lng: 124.015 }, { lat: 12.73, lng: 124.025 }, { lat: 12.718, lng: 124.028 }], source: 'PHIVOLCS Volcanic Hazard Bulletin', status: 'ACTIVE', lastUpdated: new Date().toISOString(), isDemo: true },
  ]);

  const openCreate = () => { setEditing(null); setForm({ name: '', hazardType: 'FLOOD', description: '', severity: 'MEDIUM', affectedBarangayIds: ['brgy-1'], source: 'MDRRMO Irosin Hazard Assessment', status: 'ACTIVE', coordinates: '[]' }); setIsModalOpen(true); };
  const openEdit = (h: HazardZone) => { setEditing(h); setForm({ name: h.name, hazardType: h.hazardType, description: h.description, severity: h.severity, affectedBarangayIds: h.affectedBarangayIds, source: h.source, status: h.status, coordinates: JSON.stringify(h.coordinates) }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let coords;
    try { coords = JSON.parse(form.coordinates); } catch { alert('Invalid coordinates JSON'); return; }
    const payload = { ...form, coordinates: coords };
    try {
      if (editing) { const res = await Api.updateHazard(editing.id, payload); setHazards(prev => prev.map(h => h.id === editing.id ? res.hazardZone : h)); }
      else { const res = await Api.createHazard(payload); setHazards(prev => [...prev, res.hazardZone]); }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this hazard zone? This is an official record.')) return;
    try { await Api.deleteHazard(id); setHazards(prev => prev.filter(h => h.id !== id)); } catch { alert('Delete failed.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Hazard Zone Management</h2>
          <p className="text-sm text-slate-400 mt-1">Official hazard-prone areas in Irosin, Sorsogon as mapped by MDRRMO / PHIVOLCS / MGB</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Hazard Zone
        </button>
      </div>

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-sm text-amber-300">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div><strong>Important:</strong> Only add hazard zones based on official MDRRMO, PHIVOLCS, or MGB assessments. Do not fabricate hazard-prone areas.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hazards.map(h => (
          <div key={h.id} className="glass-panel p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20"><Flame className="w-5 h-5" /></div>
                <div><p className="font-extrabold text-slate-100 leading-tight">{h.name}</p><p className="text-xs text-slate-400">{h.source}</p></div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${severityColors[h.severity]}`}>{h.severity}</span>
                {h.isDemo && <DemoBadge />}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${hazardTypeColors[h.hazardType]}`}>{h.hazardType}</span>
              {h.affectedBarangayNames?.map(b => <span key={b} className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400 border border-slate-700">{b}</span>)}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{h.description}</p>

            <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
              <span>Polygon points: {h.coordinates.length}</span>
              <span>Status: <span className="text-emerald-400 font-semibold">{h.status}</span></span>
              <span>Updated: {new Date(h.lastUpdated).toLocaleDateString()}</span>
            </div>

            <div className="flex gap-2 border-t border-slate-800 pt-3">
              <button onClick={() => openEdit(h)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(h.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition"><Trash2 className="w-3.5 h-3.5" /> Archive</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Hazard Zone' : 'Add Hazard Zone'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Name', 'name', 'text'], ['Source', 'source', 'text'], ['Description', 'description', 'text']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" />
            </div>
          ))}
          {[['Hazard Type', 'hazardType', ['FLOOD', 'LANDSLIDE', 'EARTHQUAKE', 'VOLCANIC', 'LAHAR', 'TYPHOON', 'OTHER']], ['Severity', 'severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']], ['Status', 'status', ['ACTIVE', 'INACTIVE', 'ARCHIVED']]].map(([label, key, opts]: any) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
              <select value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                {opts.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Polygon Coordinates (JSON Array of {'{lat, lng}'})</label>
            <textarea value={form.coordinates} onChange={e => setForm(p => ({ ...p, coordinates: e.target.value }))} rows={3} placeholder='[{"lat":12.707,"lng":124.03}, ...]' className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Create Hazard Zone'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

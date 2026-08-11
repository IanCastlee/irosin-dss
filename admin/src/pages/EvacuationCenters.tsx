import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Home, Phone, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Api } from '../services/api';
import { EvacuationCenter } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const statusColors: Record<string, string> = {
  OPEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CLOSED: 'bg-slate-700 text-slate-400 border-slate-600',
  FULL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  TEMPORARILY_UNAVAILABLE: 'bg-rose-500/20 text-rose-400 border-rose-500/30'
};

const emptyForm = {
  name: '', barangayId: 'brgy-1', address: '', latitude: 12.704, longitude: 124.037,
  contactPerson: '', contactPhone: '', capacity: 100, currentOccupancy: 0, status: 'OPEN',
  description: '',
  facilities: { water: true, food: true, medical: false, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: false }
};

export const EvacuationCenters: React.FC = () => {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationCenter | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });

  useEffect(() => { loadCenters(); }, []);

  const loadCenters = async () => {
    try { const res = await Api.getCenters(); setCenters(res.evacuationCenters); }
    catch { setDemoData(); }
  };

  const setDemoData = () => {
    setCenters([
      { id: 'c-1', name: 'Irosin Central School Gymnasium [DEMO DATA]', barangayId: 'brgy-2', barangayName: 'San Agustin', address: 'M.L. Quezon St, Irosin', latitude: 12.7038, longitude: 124.0375, contactPerson: 'Engr. Roberto Ramos', contactPhone: '+63 917 555 0192', capacity: 500, currentOccupancy: 45, status: 'OPEN', facilities: { water: true, food: true, medical: true, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: true }, description: 'Primary center with generator.', isDemo: true },
      { id: 'c-2', name: 'Gabao Multipurpose Covered Court [DEMO DATA]', barangayId: 'brgy-3', barangayName: 'Gabao', address: 'National Highway, Gabao', latitude: 12.7210, longitude: 124.0208, contactPerson: 'Brgy Capt. Jose Fernandez', contactPhone: '+63 928 444 8812', capacity: 350, currentOccupancy: 0, status: 'OPEN', facilities: { water: true, food: true, medical: false, restrooms: true, electricity: true, sleepingArea: true, pwdAccessible: true }, description: 'Secondary shelter.', isDemo: true },
    ]);
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setIsModalOpen(true); };
  const openEdit = (c: EvacuationCenter) => { setEditing(c); setForm({ name: c.name, barangayId: c.barangayId, address: c.address, latitude: c.latitude, longitude: c.longitude, contactPerson: c.contactPerson, contactPhone: c.contactPhone, capacity: c.capacity, currentOccupancy: c.currentOccupancy, status: c.status, description: c.description, facilities: { ...c.facilities } }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { const res = await Api.updateCenter(editing.id, form); setCenters(prev => prev.map(c => c.id === editing.id ? res.evacuationCenter : c)); }
      else { const res = await Api.createCenter(form); setCenters(prev => [...prev, res.evacuationCenter]); }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this evacuation center?')) return;
    try { await Api.deleteCenter(id); setCenters(prev => prev.filter(c => c.id !== id)); } catch { alert('Delete failed.'); }
  };

  const facilityIcons: Record<string, string> = { water: '💧', food: '🍚', medical: '🏥', restrooms: '🚻', electricity: '⚡', sleepingArea: '🛏', pwdAccessible: '♿' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Evacuation Center Management</h2>
          <p className="text-sm text-slate-400 mt-1">Official MDRRMO-designated emergency shelters in Irosin, Sorsogon</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Center
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {centers.map(c => {
          const occupancyPct = Math.round((c.currentOccupancy / c.capacity) * 100);
          return (
            <div key={c.id} className="glass-panel p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20"><Home className="w-5 h-5" /></div>
                  <div><p className="font-extrabold text-slate-100 leading-tight">{c.name}</p><p className="text-xs text-slate-400">{c.barangayName} • {c.address}</p></div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase ${statusColors[c.status]}`}>{c.status}</span>
              </div>
              {c.isDemo && <DemoBadge />}

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400"><span>Occupancy: {c.currentOccupancy} / {c.capacity}</span><span className={occupancyPct > 80 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{occupancyPct}% full</span></div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${occupancyPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${occupancyPct}%` }}></div></div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {Object.entries(c.facilities).map(([key, val]) => (
                  <span key={key} className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${val ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700 line-through'}`}>{facilityIcons[key]} {key}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800 pt-3">
                <Phone className="w-3.5 h-3.5" /><span>{c.contactPerson} — {c.contactPhone}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Evacuation Center' : 'Add Evacuation Center'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Center Name', 'name', 'text'], ['Barangay ID', 'barangayId', 'text'], ['Address', 'address', 'text'], ['Latitude', 'latitude', 'number'], ['Longitude', 'longitude', 'number'], ['Contact Person', 'contactPerson', 'text'], ['Contact Phone', 'contactPhone', 'text'], ['Capacity', 'capacity', 'number'], ['Current Occupancy', 'currentOccupancy', 'number'], ['Description', 'description', 'text']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
              {['OPEN', 'CLOSED', 'FULL', 'TEMPORARILY_UNAVAILABLE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Facilities</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(form.facilities).map(([key, val]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={val} onChange={e => setForm(p => ({ ...p, facilities: { ...p.facilities, [key]: e.target.checked } }))} className="rounded bg-slate-800" />
                  <span className="capitalize">{facilityIcons[key]} {key}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Create Center'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const facilityIcons: Record<string, string> = { water: '💧', food: '🍚', medical: '🏥', restrooms: '🚻', electricity: '⚡', sleepingArea: '🛏', pwdAccessible: '♿' };

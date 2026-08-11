import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';
import { Api } from '../services/api';
import { Barangay } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

export const Barangays: React.FC = () => {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Barangay | null>(null);
  const [form, setForm] = useState({ name: '', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.704, longitude: 124.037, population: 0 });

  useEffect(() => { loadBarangays(); }, []);

  const loadBarangays = async () => {
    try {
      const res = await Api.getBarangays();
      setBarangays(res.barangays);
    } catch { setDemoData(); }
  };

  const setDemoData = () => {
    setBarangays([
      { id: 'brgy-1', name: 'Monbon [DEMO DATA]', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7081, longitude: 124.0325, population: 4250, status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
      { id: 'brgy-2', name: 'San Agustin [DEMO DATA]', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7042, longitude: 124.0371, population: 5800, status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
      { id: 'brgy-3', name: 'Gabao [DEMO DATA]', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.7215, longitude: 124.0203, population: 3900, status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
      { id: 'brgy-4', name: 'San Julian [DEMO DATA]', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6985, longitude: 124.0412, population: 4100, status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
      { id: 'brgy-5', name: 'Buenavista [DEMO DATA]', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.6852, longitude: 124.0531, population: 3100, status: 'ACTIVE', createdAt: new Date().toISOString(), isDemo: true },
    ]);
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', municipality: 'Irosin', province: 'Sorsogon', latitude: 12.704, longitude: 124.037, population: 0 }); setIsModalOpen(true); };
  const openEdit = (b: Barangay) => { setEditing(b); setForm({ name: b.name, municipality: b.municipality, province: b.province, latitude: b.latitude, longitude: b.longitude, population: b.population || 0 }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        const res = await Api.updateBarangay(editing.id, form);
        setBarangays(prev => prev.map(b => b.id === editing.id ? res.barangay : b));
      } else {
        const res = await Api.createBarangay(form);
        setBarangays(prev => [...prev, res.barangay]);
      }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this barangay?')) return;
    try { await Api.deleteBarangay(id); setBarangays(prev => prev.filter(b => b.id !== id)); } catch { alert('Delete failed.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Barangay Management</h2>
          <p className="text-sm text-slate-400 mt-1">Selected barangays in Irosin, Sorsogon under MDRRMO monitoring</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Barangay
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {barangays.map(b => (
          <div key={b.id} className="glass-panel p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><MapPin className="w-5 h-5" /></div>
                <div>
                  <p className="font-extrabold text-slate-100 leading-tight">{b.name}</p>
                  <p className="text-xs text-slate-400">{b.municipality}, {b.province}</p>
                </div>
              </div>
              {b.isDemo && <DemoBadge />}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div><span className="font-semibold text-slate-300">Population:</span> {b.population?.toLocaleString() || 'N/A'}</div>
              <div><span className="font-semibold text-slate-300">Status:</span> <span className="text-emerald-400">{b.status}</span></div>
              <div><span className="font-semibold text-slate-300">Lat:</span> {b.latitude}</div>
              <div><span className="font-semibold text-slate-300">Lng:</span> {b.longitude}</div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-800">
              <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(b.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Barangay' : 'Add Barangay'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Name', 'name', 'text'], ['Municipality', 'municipality', 'text'], ['Province', 'province', 'text'], ['Latitude', 'latitude', 'number'], ['Longitude', 'longitude', 'number'], ['Population', 'population', 'number']].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value }))} required={key !== 'population'} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Create Barangay'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

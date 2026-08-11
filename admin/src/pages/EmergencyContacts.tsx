import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, PhoneCall } from 'lucide-react';
import { Api } from '../services/api';
import { EmergencyContact } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const categoryColors: Record<string, string> = {
  MDRRMO: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  BARANGAY_OFFICE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POLICE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FIRE_STATION: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  HOSPITAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  RESCUE_TEAM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  OTHER: 'bg-slate-700 text-slate-400 border-slate-600',
};

const emptyForm = { organization: '', contactPerson: '', phone: '', email: '', address: '', category: 'MDRRMO', barangayId: '', description: '', priority: 1, status: 'ACTIVE' };

export const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    try { const res = await Api.getContacts(); setContacts(res.emergencyContacts); }
    catch { setDemoData(); }
  };

  const setDemoData = () => setContacts([
    { id: 'ct-1', organization: 'MDRRMO Irosin EOC [DEMO DATA]', contactPerson: 'Duty Disaster Officer', phone: '0917-123-4567', address: 'Municipal Hall Complex, San Agustin, Irosin', category: 'MDRRMO', description: '24/7 Main Emergency Hotline', priority: 1, status: 'ACTIVE', isDemo: true },
    { id: 'ct-2', organization: 'PNP Irosin Station [DEMO DATA]', contactPerson: 'Desk Officer', phone: '0998-598-6123', address: 'Poblacion, Irosin', category: 'POLICE', description: 'Police assistance during emergencies.', priority: 2, status: 'ACTIVE', isDemo: true },
    { id: 'ct-3', organization: 'BFP Irosin [DEMO DATA]', contactPerson: 'Fire Station Control', phone: '0939-912-3456', address: 'San Agustin, Irosin', category: 'FIRE_STATION', description: 'Fire and rescue operations.', priority: 3, status: 'ACTIVE', isDemo: true },
    { id: 'ct-4', organization: 'Irosin District Hospital ER [DEMO DATA]', contactPerson: 'ER Triage Officer', phone: '056-311-1234', address: 'San Julian, Irosin', category: 'HOSPITAL', description: 'Medical emergencies and ambulance dispatch.', priority: 4, status: 'ACTIVE', isDemo: true },
  ]);

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setIsModalOpen(true); };
  const openEdit = (c: EmergencyContact) => { setEditing(c); setForm({ organization: c.organization, contactPerson: c.contactPerson, phone: c.phone, email: c.email || '', address: c.address, category: c.category, barangayId: c.barangayId || '', description: c.description, priority: c.priority, status: c.status }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) { const res = await Api.updateContact(editing.id, form); setContacts(prev => prev.map(c => c.id === editing.id ? res.emergencyContact : c)); }
      else { const res = await Api.createContact(form); setContacts(prev => [...prev, res.emergencyContact]); }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    try { await Api.deleteContact(id); setContacts(prev => prev.filter(c => c.id !== id)); } catch { alert('Delete failed.'); }
  };

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Emergency Contacts</h2>
          <p className="text-sm text-slate-400 mt-1">Official emergency contact directory for Irosin, Sorsogon</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map(c => (
          <div key={c.id} className="glass-panel p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20"><PhoneCall className="w-5 h-5" /></div>
                <div><p className="font-extrabold text-slate-100 leading-tight">{c.organization}</p><p className="text-xs text-slate-400">{c.contactPerson}</p></div>
              </div>
              {c.isDemo && <DemoBadge />}
            </div>
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${categoryColors[c.category]}`}>{c.category.replace('_', ' ')}</span>
            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-bold text-sky-400 text-base">{c.phone}</p>
              <p className="text-slate-400">{c.address}</p>
              <p className="text-slate-400 italic">{c.description}</p>
            </div>
            <div className="flex gap-2 pt-1 border-t border-slate-800">
              <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
              <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition"><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Organization', 'organization', 'text'], ['Contact Person', 'contactPerson', 'text'], ['Phone Number', 'phone', 'text'], ['Email (optional)', 'email', 'email'], ['Address', 'address', 'text'], ['Description', 'description', 'text'], ['Priority (1=highest)', 'priority', 'number']].map(([label, key, type]) => (
            <div key={key}><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label><input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) : e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" /></div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
              {['MDRRMO', 'BARANGAY_OFFICE', 'POLICE', 'FIRE_STATION', 'HOSPITAL', 'RESCUE_TEAM', 'OTHER'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Add Contact'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

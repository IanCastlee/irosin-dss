import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, PhoneCall, Loader2 } from 'lucide-react';
import { Api } from '../services/api';
import { EmergencyContact } from '../types';
import { Modal } from '../components/Common/Modal';
import { CardSkeleton } from '../components/Common/LoadingSpinner';

const categoryColors: Record<string, string> = {
  MDRRMO: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  GOVERNMENT: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  BARANGAY_OFFICE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POLICE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FIRE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  FIRE_STATION: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  HOSPITAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  MEDICAL: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  RESCUE_TEAM: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SEARCH_RESCUE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  NGO: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  OTHER: 'bg-slate-700 text-slate-400 border-slate-600',
};

const emptyForm = { organization: '', contactPerson: '', phone: '', email: '', address: '', category: 'MDRRMO', barangayId: '', description: '', priority: 1, status: 'ACTIVE' };

export const EmergencyContacts: React.FC = () => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyContact | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const res = await Api.getContacts();
      setContacts(res.emergencyContacts || []);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm({ ...emptyForm }); setIsModalOpen(true); };
  const openEdit = (c: EmergencyContact) => {
    setEditing(c);
    setForm({
      organization: c.organization || '',
      contactPerson: c.contactPerson || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      category: c.category || 'MDRRMO',
      barangayId: c.barangayId || '',
      description: c.description || '',
      priority: c.priority || 1,
      status: c.status || 'ACTIVE'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const res = await Api.updateContact(editing.id, form);
        setContacts(prev => prev.map(c => c.id === editing.id ? res.emergencyContact : c));
      } else {
        const res = await Api.createContact(form);
        setContacts(prev => [...prev, res.emergencyContact]);
      }
      setIsModalOpen(false);
    } catch {
      alert('Could not save. Check backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    setDeletingId(id);
    try {
      await Api.deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch {
      alert('Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const sorted = [...contacts].sort((a, b) => (a.priority || 1) - (b.priority || 1));

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Emergency Contacts</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Official emergency contact directory for Irosin, Sorsogon</p>
        </div>
        <button
          onClick={openCreate}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-sky-600/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : sorted.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No emergency contacts registered. Click "+ Add Contact" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(c => {
            const cat = c.category || 'MDRRMO';
            const badgeClass = categoryColors[cat] || categoryColors.OTHER;
            return (
              <div key={c.id} className="glass-panel p-4 sm:p-5 space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0"><PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-100 text-sm sm:text-base leading-tight break-words">{c.organization}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{c.contactPerson}</p>
                    </div>
                  </div>
                </div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${badgeClass}`}>
                  {cat.replace('_', ' ')}
                </span>
                <div className="space-y-1 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                  <p className="font-bold text-sky-400 text-sm sm:text-base">{c.phone}</p>
                  {c.address && <p className="text-slate-400 text-[11px] break-words">{c.address}</p>}
                  {c.description && <p className="text-slate-400 italic text-[11px] break-words">{c.description}</p>}
                </div>
                <div className="flex gap-2 pt-1 border-t border-slate-800">
                  <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {deletingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Emergency Contact' : 'Add Emergency Contact'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['Organization', 'organization', 'text'], ['Contact Person', 'contactPerson', 'text'], ['Phone Number', 'phone', 'text'], ['Email (optional)', 'email', 'email'], ['Address', 'address', 'text'], ['Description', 'description', 'text'], ['Priority (1=highest)', 'priority', 'number']].map(([label, key, type]) => (
            <div key={key}><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label><input type={type} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 1 : e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition" /></div>
          ))}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
              {['MDRRMO', 'GOVERNMENT', 'BARANGAY_OFFICE', 'POLICE', 'FIRE_STATION', 'FIRE', 'HOSPITAL', 'MEDICAL', 'RESCUE_TEAM', 'SEARCH_RESCUE', 'NGO', 'OTHER'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editing ? 'Save Changes' : 'Create Contact'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

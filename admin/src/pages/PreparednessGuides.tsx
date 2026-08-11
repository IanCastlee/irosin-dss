import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Api } from '../services/api';
import { PreparednessGuide } from '../types';
import { DemoBadge } from '../components/Common/DemoBadge';
import { Modal } from '../components/Common/Modal';

const categoryColors: Record<string, string> = {
  BEFORE: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  DURING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  AFTER: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const hazardColors: Record<string, string> = {
  TYPHOON: 'bg-cyan-500/20 text-cyan-400',
  FLOOD: 'bg-blue-500/20 text-blue-400',
  EARTHQUAKE: 'bg-purple-500/20 text-purple-400',
  VOLCANIC_ERUPTION: 'bg-red-500/20 text-red-400',
  LANDSLIDE: 'bg-orange-500/20 text-orange-400',
  GENERAL: 'bg-slate-700 text-slate-400',
};

export const PreparednessGuides: React.FC = () => {
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PreparednessGuide | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '', checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '', priority: 1, isPublished: true });

  useEffect(() => { loadGuides(); }, []);

  const loadGuides = async () => {
    try { const res = await Api.getGuides(); setGuides(res.preparednessGuides); }
    catch { setDemoData(); }
  };

  const setDemoData = () => setGuides([
    { id: 'g-1', title: 'Typhoon & Heavy Rainfall Preparedness [DEMO DATA]', hazardType: 'TYPHOON', category: 'BEFORE', introduction: 'Essential steps to protect your family before a typhoon makes landfall in Irosin.', checklist: ['Secure roof sheets and outdoor items.', 'Prepare Go-Bag with 3-day supplies.', 'Charge all mobile phones.', 'Know your official evacuation route.'], instructions: ['Monitor official MDRRMO announcements.', 'If near Cadacan River, evacuate early.'], emergencyActions: ['Call MDRRMO hotline if trapped by rising floodwaters.'], warnings: ['Do NOT cross swollen rivers.'], priority: 1, isPublished: true, isDemo: true },
    { id: 'g-2', title: 'Bulusan Volcanic Ashfall Safety Protocol [DEMO DATA]', hazardType: 'VOLCANIC_ERUPTION', category: 'DURING', introduction: 'Safety actions when Mt. Bulusan experiences eruption with heavy ashfall.', checklist: ['Prepare N95 masks for every family member.', 'Close all doors and windows.', 'Protect water storage tanks.'], instructions: ['Stay indoors unless evacuation is ordered.', 'Wear protective goggles when outside.'], emergencyActions: ['Evacuate if roof collapse risk detected.'], warnings: ['Avoid driving during heavy ashfall.'], priority: 2, isPublished: true, isDemo: true },
  ]);

  const openCreate = () => { setEditing(null); setForm({ title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '', checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '', priority: 1, isPublished: true }); setIsModalOpen(true); };
  const openEdit = (g: PreparednessGuide) => { setEditing(g); setForm({ title: g.title, hazardType: g.hazardType, category: g.category, introduction: g.introduction, checklistStr: g.checklist.join('\n'), instructionsStr: g.instructions.join('\n'), emergencyActionsStr: g.emergencyActions.join('\n'), warningsStr: g.warnings.join('\n'), priority: g.priority, isPublished: g.isPublished }); setIsModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, checklist: form.checklistStr.split('\n').filter(Boolean), instructions: form.instructionsStr.split('\n').filter(Boolean), emergencyActions: form.emergencyActionsStr.split('\n').filter(Boolean), warnings: form.warningsStr.split('\n').filter(Boolean) };
    delete (payload as any).checklistStr; delete (payload as any).instructionsStr; delete (payload as any).emergencyActionsStr; delete (payload as any).warningsStr;
    try {
      if (editing) { const res = await Api.updateGuide(editing.id, payload); setGuides(prev => prev.map(g => g.id === editing.id ? res.preparednessGuide : g)); }
      else { const res = await Api.createGuide(payload); setGuides(prev => [...prev, res.preparednessGuide]); }
    } catch { alert('Could not save. Check backend.'); }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Preparedness Guides</h2>
          <p className="text-sm text-slate-400 mt-1">Official disaster preparedness content managed by MDRRMO Irosin</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20">
          <Plus className="w-4 h-4" /> Add Guide
        </button>
      </div>

      <div className="space-y-3">
        {guides.map(g => (
          <div key={g.id} className="glass-panel overflow-hidden">
            <div className="p-5 flex items-center justify-between gap-3 cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0"><BookOpen className="w-5 h-5" /></div>
                <div>
                  <p className="font-extrabold text-slate-100">{g.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hazardColors[g.hazardType]}`}>{g.hazardType.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${categoryColors[g.category]}`}>{g.category}</span>
                    {g.isDemo && <DemoBadge />}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${g.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}>{g.isPublished ? '● Published' : '○ Draft'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={e => { e.stopPropagation(); openEdit(g); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"><Edit2 className="w-4 h-4" /></button>
                <button onClick={e => { e.stopPropagation(); if (confirm('Delete this guide?')) setGuides(prev => prev.filter(x => x.id !== g.id)); }} className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 transition"><Trash2 className="w-4 h-4" /></button>
                {expanded === g.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </div>
            {expanded === g.id && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-800 pt-4">
                <p className="text-sm text-slate-300">{g.introduction}</p>
                {g.checklist.length > 0 && <div><p className="text-xs font-bold text-slate-200 uppercase mb-1.5">✓ Checklist</p><ul className="space-y-1">{g.checklist.map((i, idx) => <li key={idx} className="text-xs text-slate-300 flex gap-2"><span className="text-emerald-400 shrink-0">✓</span>{i}</li>)}</ul></div>}
                {g.warnings.length > 0 && <div><p className="text-xs font-bold text-amber-400 uppercase mb-1.5">⚠ Warnings</p><ul className="space-y-1">{g.warnings.map((w, idx) => <li key={idx} className="text-xs text-amber-300/80">⚠ {w}</li>)}</ul></div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Guide' : 'Add Preparedness Guide'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Title</label><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Introduction</label><textarea value={form.introduction} onChange={e => setForm(p => ({ ...p, introduction: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          {[['Hazard Type', 'hazardType', ['TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE', 'GENERAL']], ['Category', 'category', ['BEFORE', 'DURING', 'AFTER']]].map(([label, key, opts]: any) => (
            <div key={key}><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label><select value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">{opts.map((o: string) => <option key={o} value={o}>{o}</option>)}</select></div>
          ))}
          {[['Checklist Items (one per line)', 'checklistStr'], ['Instructions (one per line)', 'instructionsStr'], ['Emergency Actions (one per line)', 'emergencyActionsStr'], ['Warnings (one per line)', 'warningsStr']].map(([label, key]) => (
            <div key={key}><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">{label}</label><textarea value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} /> Published (visible to residents)</label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">{editing ? 'Save Changes' : 'Create Guide'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

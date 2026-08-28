import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Api } from '../services/api';
import { PreparednessGuide } from '../types';
import { Modal } from '../components/Common/Modal';
import { CardSkeleton } from '../components/Common/LoadingSpinner';

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
  VOLCANIC: 'bg-red-500/20 text-red-400',
  LANDSLIDE: 'bg-orange-500/20 text-orange-400',
  GENERAL: 'bg-slate-700 text-slate-400',
};

export const PreparednessGuides: React.FC = () => {
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PreparednessGuide | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '',
    checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '',
    priority: 1, isPublished: true
  });

  useEffect(() => { loadGuides(); }, []);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const res = await Api.getGuides();
      setGuides(res.preparednessGuides || []);
    } catch (err: any) {
      console.error('Failed to load guides:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '',
      checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '',
      priority: 1, isPublished: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (g: any) => {
    setEditing(g);
    const checklistArr = Array.isArray(g.checklist) ? g.checklist : (Array.isArray(g.steps) ? g.steps : []);
    const instructionsArr = Array.isArray(g.instructions) ? g.instructions : [];
    const emergencyActionsArr = Array.isArray(g.emergencyActions) ? g.emergencyActions : [];
    const warningsArr = Array.isArray(g.warnings) ? g.warnings : [];

    setForm({
      title: g.title || '',
      hazardType: g.hazardType || 'FLOOD',
      category: g.category || 'BEFORE',
      introduction: g.introduction || '',
      checklistStr: checklistArr.join('\n'),
      instructionsStr: instructionsArr.join('\n'),
      emergencyActionsStr: emergencyActionsArr.join('\n'),
      warningsStr: warningsArr.join('\n'),
      priority: g.priority || 1,
      isPublished: g.isPublished ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      checklist: form.checklistStr.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: form.instructionsStr.split('\n').map(s => s.trim()).filter(Boolean),
      emergencyActions: form.emergencyActionsStr.split('\n').map(s => s.trim()).filter(Boolean),
      warnings: form.warningsStr.split('\n').map(s => s.trim()).filter(Boolean),
      steps: form.checklistStr.split('\n').map(s => s.trim()).filter(Boolean)
    };
    delete (payload as any).checklistStr;
    delete (payload as any).instructionsStr;
    delete (payload as any).emergencyActionsStr;
    delete (payload as any).warningsStr;

    setSaving(true);
    try {
      if (editing) {
        const res = await Api.updateGuide(editing.id, payload);
        setGuides(prev => prev.map(g => g.id === editing.id ? res.preparednessGuide : g));
      } else {
        const res = await Api.createGuide(payload);
        setGuides(prev => [...prev, res.preparednessGuide]);
      }
      setIsModalOpen(false);
    } catch {
      alert('Could not save. Check backend.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this guide?')) return;
    setDeletingId(id);
    try {
      await Api.deleteGuide(id);
      setGuides(prev => prev.filter(x => x.id !== id));
    } catch {
      alert('Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Preparedness Guides</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Official disaster preparedness content managed by MDRRMO Irosin</p>
        </div>
        <button
          onClick={openCreate}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-sky-600/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Guide</span>
        </button>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : guides.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No preparedness guides found. Click "+ Add Guide" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {guides.map((g: any) => {
            const checklist = Array.isArray(g.checklist) ? g.checklist : (Array.isArray(g.steps) ? g.steps : []);
            const warnings = Array.isArray(g.warnings) ? g.warnings : [];
            const instructions = Array.isArray(g.instructions) ? g.instructions : [];
            const emergencyActions = Array.isArray(g.emergencyActions) ? g.emergencyActions : [];

            return (
              <div key={g.id} className="glass-panel overflow-hidden">
                <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0 mt-0.5">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug break-words">{g.title}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hazardColors[g.hazardType] || 'bg-slate-700 text-slate-300'}`}>
                            {(g.hazardType || 'GENERAL').replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${categoryColors[g.category] || categoryColors.BEFORE}`}>
                            {g.category || 'BEFORE'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${g.isPublished ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {g.isPublished ? '● Published' : '○ Draft'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(g); }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(g.id); }}
                        disabled={deletingId === g.id}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 transition disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="p-1 text-slate-400">
                        {expanded === g.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>
                {expanded === g.id && (
                  <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 space-y-4 border-t border-slate-800 pt-3 sm:pt-4">
                    <p className="text-sm text-slate-300">{g.introduction}</p>
                    {checklist.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-200 uppercase mb-1.5">✓ Checklist / Steps</p>
                        <ul className="space-y-1">
                          {checklist.map((item: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-300 flex gap-2">
                              <span className="text-emerald-400 shrink-0">✓</span>{item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {instructions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-sky-300 uppercase mb-1.5">📋 Instructions</p>
                        <ul className="space-y-1">
                          {instructions.map((inst: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-300 flex gap-2">
                              <span className="text-sky-400 shrink-0">•</span>{inst}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {emergencyActions.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-red-300 uppercase mb-1.5">🚨 Emergency Actions</p>
                        <ul className="space-y-1">
                          {emergencyActions.map((act: string, idx: number) => (
                            <li key={idx} className="text-xs text-slate-300 flex gap-2">
                              <span className="text-red-400 shrink-0">!</span>{act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-400 uppercase mb-1.5">⚠ Warnings</p>
                        <ul className="space-y-1">
                          {warnings.map((w: string, idx: number) => (
                            <li key={idx} className="text-xs text-amber-300/80">⚠ {w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Guide' : 'Add Preparedness Guide'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Title</label><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Hazard Type</label>
              <select value={form.hazardType} onChange={e => setForm(p => ({ ...p, hazardType: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                {['FLOOD', 'TYPHOON', 'VOLCANIC_ERUPTION', 'VOLCANIC', 'LANDSLIDE', 'EARTHQUAKE', 'GENERAL'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                {['BEFORE', 'DURING', 'AFTER'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Introduction</label><textarea value={form.introduction} onChange={e => setForm(p => ({ ...p, introduction: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Checklist / Steps (1 per line)</label><textarea value={form.checklistStr} onChange={e => setForm(p => ({ ...p, checklistStr: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Warnings (1 per line)</label><textarea value={form.warningsStr} onChange={e => setForm(p => ({ ...p, warningsStr: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pub" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} className="rounded bg-slate-800" />
            <label htmlFor="pub" className="text-sm text-slate-300 cursor-pointer">Published to Residents</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" disabled={saving} onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editing ? 'Save Changes' : 'Create Guide'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, BookOpen, ChevronDown, ChevronUp, Loader2, Upload, Image as ImageIcon, Sparkles, CheckCircle2, X } from 'lucide-react';
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

// Client-side image resize and convert to WebP format
const compressAndConvertToWebP = (
  file: File,
  maxWidth = 1000,
  maxHeight = 700,
  quality = 0.8
): Promise<{ dataUrl: string; sizeKb: number; originalSizeKb: number }> => {
  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP format with quality compression
        let webpDataUrl = canvas.toDataURL('image/webp', quality);
        if (!webpDataUrl.startsWith('data:image/webp')) {
          webpDataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Estimate size in KB from base64 string length
        const head = webpDataUrl.indexOf(',') + 1;
        const sizeKb = Math.round(((webpDataUrl.length - head) * 3) / 4 / 1024);

        resolve({ dataUrl: webpDataUrl, sizeKb, originalSizeKb });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const PreparednessGuides: React.FC = () => {
  const [guides, setGuides] = useState<PreparednessGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PreparednessGuide | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ originalSizeKb: number; sizeKb: number; percent: number } | null>(null);

  const [form, setForm] = useState({
    title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '',
    checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '',
    imageUrl: '', priority: 1, isPublished: true
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
    setUploadStats(null);
    setForm({
      title: '', hazardType: 'FLOOD', category: 'BEFORE', introduction: '',
      checklistStr: '', instructionsStr: '', emergencyActionsStr: '', warningsStr: '',
      imageUrl: '', priority: 1, isPublished: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (g: any) => {
    setEditing(g);
    setUploadStats(null);
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
      imageUrl: g.imageUrl || g.image || '',
      priority: g.priority || 1,
      isPublished: g.isPublished ?? true
    });
    setIsModalOpen(true);
  };

  // Local file upload with WebP conversion & auto-compression
  const handleLocalImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pumili lamang ng wastong image file (PNG, JPG, WebP).');
      return;
    }

    try {
      setIsCompressing(true);
      const res = await compressAndConvertToWebP(file, 1000, 700, 0.8);
      setForm(prev => ({ ...prev, imageUrl: res.dataUrl }));

      const savedPercent = res.originalSizeKb > 0
        ? Math.round(((res.originalSizeKb - res.sizeKb) / res.originalSizeKb) * 100)
        : 0;

      setUploadStats({
        originalSizeKb: res.originalSizeKb,
        sizeKb: res.sizeKb,
        percent: savedPercent > 0 ? savedPercent : 0
      });
    } catch (err) {
      console.error('Compression error:', err);
      alert('Nagka-problema sa pag-compress ng litrato.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      imageUrl: form.imageUrl.trim() || undefined,
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
            const img = g.imageUrl || g.image;

            return (
              <div key={g.id} className="glass-panel overflow-hidden">
                <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {img ? (
                        <img src={img} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-slate-700 shrink-0 mt-0.5 shadow-sm" />
                      ) : (
                        <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      )}
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
                    {img && (
                      <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img src={img} alt={g.title} className="w-full h-full object-cover" />
                      </div>
                    )}
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
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Title</label><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500" placeholder="Hal. Paghahanda Bago Magkaroon ng Lindol" required /></div>
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

          {/* Picture / Illustration: Local Upload (Auto-convert to WebP & Compress) OR Image URL */}
          <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Picture / Illustration (Litrato ng Gagawin)
              </label>
              {form.imageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setForm(p => ({ ...p, imageUrl: '' }));
                    setUploadStats(null);
                  }}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                >
                  <X className="w-3 h-3" />
                  <span>Alisin ang Litrato</span>
                </button>
              ) : null}
            </div>

            {/* Hidden Local File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleLocalImageSelect}
              className="hidden"
            />

            {/* Action Row: Local File Upload */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                    <span>Ina-adjust at kino-convert sa WebP...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>Mag-upload mula sa Device (Auto-WebP)</span>
                  </>
                )}
              </button>
            </div>

            {/* Or Paste Custom Image Link */}
            <div>
              <input
                type="url"
                value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                onChange={e => {
                  setForm(p => ({ ...p, imageUrl: e.target.value }));
                  setUploadStats(null);
                }}
                placeholder="O mag-paste ng direct image URL (https://...)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Compression Stats Badge */}
            {uploadStats && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Na-compress sa WebP: {uploadStats.originalSizeKb} KB ➔ <strong>{uploadStats.sizeKb} KB</strong> ({uploadStats.percent}% mas magaan!)
                </span>
              </div>
            )}

            {/* Live Image Preview */}
            {form.imageUrl.trim() ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 mt-1">
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[10px] font-bold text-slate-200">
                  {form.imageUrl.startsWith('data:image/webp') ? 'Format: WebP' : 'Image Preview'}
                </div>
              </div>
            ) : null}
          </div>

          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Introduction</label><textarea value={form.introduction} onChange={e => setForm(p => ({ ...p, introduction: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" placeholder="Ilarawan ang layunin at pangkalahatang paalala..." required /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Checklist / Steps (1 per line)</label><textarea value={form.checklistStr} onChange={e => setForm(p => ({ ...p, checklistStr: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" placeholder="I-anchor o itali sa dingding ang matatayog na aparador...&#10;Alamin ang mga matitibay na mesa..." /></div>
          <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Warnings (1 per line)</label><textarea value={form.warningsStr} onChange={e => setForm(p => ({ ...p, warningsStr: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none" placeholder="Huwag maglagay ng mabibigat na gamit sa ulunan ng kama..." /></div>
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

import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, BookOpen, ChevronDown, ChevronUp, Loader2, Upload, Image as ImageIcon, Sparkles, CheckCircle2, X, Video, Play, Settings, AlertCircle } from 'lucide-react';
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

// Automatic Cloudinary Video Optimization
// Injects q_auto, f_auto, w_1280, c_limit, vc_auto transformations for fast mobile streaming
export const optimizeCloudinaryVideoUrl = (rawUrl: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;
  const trimmed = rawUrl.trim();
  if (!trimmed.includes('cloudinary.com') || !trimmed.includes('/video/upload/')) {
    return trimmed;
  }
  const parts = trimmed.split('/video/upload/');
  if (parts.length === 2) {
    const afterUpload = parts[1];
    if (afterUpload.startsWith('q_auto') || afterUpload.includes('/q_auto')) {
      return trimmed;
    }
    return `${parts[0]}/video/upload/q_auto,f_auto,w_1280,c_limit,vc_auto/${afterUpload}`;
  }
  return trimmed;
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
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ originalSizeKb: number; sizeKb: number; percent: number } | null>(null);

  // Cloudinary Direct Video Upload & Optimization States
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [cloudinaryCloudName, setCloudinaryCloudName] = useState(() => localStorage.getItem('irosin_cloudinary_cloud_name') || '');
  const [cloudinaryPreset, setCloudinaryPreset] = useState(() => localStorage.getItem('irosin_cloudinary_preset') || '');
  const [showCloudinaryConfig, setShowCloudinaryConfig] = useState(false);
  const [cloudinaryError, setCloudinaryError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', hazardType: 'FLOOD', category: 'BEFORE',
    mediaType: 'IMAGE' as 'IMAGE' | 'VIDEO',
    imageUrl: '', videoUrl: '', priority: 1, isPublished: true
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
      title: '', hazardType: 'FLOOD', category: 'BEFORE',
      mediaType: 'IMAGE',
      imageUrl: '', videoUrl: '', priority: 1, isPublished: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (g: any) => {
    setEditing(g);
    setUploadStats(null);
    const mediaType = g.mediaType || (g.videoUrl ? 'VIDEO' : 'IMAGE');
    setForm({
      title: g.title || '',
      hazardType: g.hazardType || 'FLOOD',
      category: g.category || 'BEFORE',
      mediaType,
      imageUrl: g.imageUrl || g.image || '',
      videoUrl: g.videoUrl || g.mediaUrl || '',
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

  // Direct Video File Upload to Cloudinary with real-time progress & auto-optimization
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Pakiusap, pumili ng wastong video file (.mp4, .mov, .webm).');
      return;
    }

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    if (file.size > 80 * 1024 * 1024) {
      if (!confirm(`Ang napiling video ay may laking ${fileSizeMb} MB. Maaaring magtagal ang pag-upload. Nais mo bang magpatuloy?`)) {
        return;
      }
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    setCloudinaryError(null);

    try {
      // 1. Fetch official backend signature from .env CLOUDINARY_URL
      let signData: any = null;
      try {
        signData = await Api.getCloudinarySignature();
      } catch (err) {
        console.warn('Backend Cloudinary signature endpoint returned error:', err);
      }

      const formData = new FormData();
      formData.append('file', file);

      let uploadUrl = '';

      if (signData && signData.cloudName && signData.signature) {
        // Backend signed direct upload (Zero client configuration needed!)
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', String(signData.timestamp));
        formData.append('folder', signData.folder);
        formData.append('signature', signData.signature);
        uploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/video/upload`;
      } else {
        // Client-side fallback if any
        const activeCloud = cloudinaryCloudName.trim() || localStorage.getItem('irosin_cloudinary_cloud_name') || '';
        const activePreset = cloudinaryPreset.trim() || localStorage.getItem('irosin_cloudinary_preset') || '';

        if (!activeCloud || !activePreset) {
          setIsUploadingVideo(false);
          setShowCloudinaryConfig(true);
          setCloudinaryError('Paki-save muna ang iyong Cloudinary Cloud Name at Upload Preset sa ibaba bago mag-upload.');
          return;
        }

        formData.append('upload_preset', activePreset);
        formData.append('folder', 'irosin_preparedness_videos');
        uploadUrl = `https://api.cloudinary.com/v1_1/${activeCloud}/video/upload`;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setVideoUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        setIsUploadingVideo(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            const secureUrl = resp.secure_url || resp.url;
            const optimizedUrl = optimizeCloudinaryVideoUrl(secureUrl);
            setForm(prev => ({ ...prev, videoUrl: optimizedUrl }));
            setCloudinaryError(null);
          } catch {
            setCloudinaryError('Hindi ma-parse ang tugon mula sa Cloudinary.');
          }
        } else {
          try {
            const errResp = JSON.parse(xhr.responseText);
            setCloudinaryError(errResp?.error?.message || `Upload failed with status ${xhr.status}`);
          } catch {
            setCloudinaryError(`Upload failed (${xhr.status}). Pakisuri ang Cloudinary configuration.`);
          }
        }
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      };

      xhr.onerror = () => {
        setIsUploadingVideo(false);
        setCloudinaryError('Network error sa pag-upload sa Cloudinary. Pakisuri ang internet connection.');
        if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      };

      xhr.send(formData);
    } catch (err: any) {
      setIsUploadingVideo(false);
      setCloudinaryError(err?.message || 'Nagka-problema sa pagsisimula ng video upload.');
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  const handleSaveCloudinaryConfig = () => {
    if (!cloudinaryCloudName.trim() || !cloudinaryPreset.trim()) {
      alert('Paki-fill out ang parehong Cloud Name at Upload Preset.');
      return;
    }
    localStorage.setItem('irosin_cloudinary_cloud_name', cloudinaryCloudName.trim());
    localStorage.setItem('irosin_cloudinary_preset', cloudinaryPreset.trim());
    setShowCloudinaryConfig(false);
    setCloudinaryError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      hazardType: form.hazardType,
      category: form.category,
      mediaType: form.mediaType,
      imageUrl: form.mediaType === 'IMAGE' ? (form.imageUrl.trim() || undefined) : undefined,
      videoUrl: form.mediaType === 'VIDEO' ? (form.videoUrl.trim() || undefined) : undefined,
      mediaUrl: form.mediaType === 'VIDEO' ? form.videoUrl.trim() : form.imageUrl.trim(),
      priority: form.priority,
      isPublished: form.isPublished,
      introduction: '',
      checklist: [],
      instructions: [],
      emergencyActions: [],
      warnings: [],
      steps: []
    };

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
            const isVideo = g.mediaType === 'VIDEO' || (!g.imageUrl && g.videoUrl);
            const mediaSrc = isVideo ? (g.videoUrl || g.mediaUrl) : (g.imageUrl || g.image || g.mediaUrl);

            return (
              <div key={g.id} className="glass-panel overflow-hidden">
                <div className="p-3.5 sm:p-5 flex flex-col gap-2.5 cursor-pointer" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                      {mediaSrc && !isVideo ? (
                        <img src={mediaSrc} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover rounded-xl border border-slate-700 shrink-0 mt-0.5 shadow-sm" />
                      ) : isVideo ? (
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-500/10 text-red-400 rounded-xl border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Play className="w-5 h-5 fill-red-400" />
                        </div>
                      ) : (
                        <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-100 text-sm sm:text-base leading-snug break-words">{g.title}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isVideo ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'}`}>
                            {isVideo ? '🎬 VIDEO CLIP' : '🖼️ IMAGE'}
                          </span>
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
                  <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 space-y-3 border-t border-slate-800 pt-3 sm:pt-4">
                    {isVideo && mediaSrc ? (
                      <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                        {mediaSrc.includes('youtube.com') || mediaSrc.includes('youtu.be') ? (
                          <iframe
                            src={mediaSrc.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                            title={g.title}
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video src={mediaSrc} controls className="w-full h-full object-contain" />
                        )}
                      </div>
                    ) : mediaSrc ? (
                      <div className="w-full max-h-96 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                        <img src={mediaSrc} alt={g.title} className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-900/40 rounded-xl text-center text-xs text-slate-500">
                        Walang litrato o video clip na nakakabit.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Guide (Media Clip)' : 'Add Preparedness Guide'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Guide Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              placeholder="Hal. Paghahanda sa Lindol (Duck, Cover & Hold)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Hazard Type</label>
              <select value={form.hazardType} onChange={e => setForm(p => ({ ...p, hazardType: e.target.value as any }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                {['FLOOD', 'TYPHOON', 'VOLCANIC_ERUPTION', 'VOLCANIC', 'LANDSLIDE', 'EARTHQUAKE', 'GENERAL'].map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Category (Phase)</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as any }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500">
                {['BEFORE', 'DURING', 'AFTER'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Media Type Option: Image or Video Clip */}
          <div className="space-y-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Media Format (Option lang kung Video o Image)
              </label>
            </div>

            {/* Toggle Buttons: Image vs Video */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, mediaType: 'IMAGE' }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition border ${
                  form.mediaType === 'IMAGE'
                    ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image / Illustration</span>
              </button>

              <button
                type="button"
                onClick={() => setForm(p => ({ ...p, mediaType: 'VIDEO' }))}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition border ${
                  form.mediaType === 'VIDEO'
                    ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Clip</span>
              </button>
            </div>

            {form.mediaType === 'IMAGE' ? (
              <div className="space-y-2 pt-1">
                {/* Hidden Local File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLocalImageSelect}
                  className="hidden"
                />

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
                        <span>Mag-upload ng Litrato (Auto-WebP)</span>
                      </>
                    )}
                  </button>
                </div>

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

                {uploadStats && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Na-compress sa WebP: {uploadStats.originalSizeKb} KB ➔ <strong>{uploadStats.sizeKb} KB</strong> ({uploadStats.percent}% mas magaan!)
                    </span>
                  </div>
                )}

                {form.imageUrl.trim() ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 mt-1">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    <button
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, imageUrl: '' })); setUploadStats(null); }}
                      className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-950/80 border border-rose-500/40 text-[10px] font-bold text-rose-300 hover:bg-rose-950"
                    >
                      Alisin
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {/* Hidden Local Video File Input */}
                <input
                  type="file"
                  ref={videoFileInputRef}
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />

                {/* Video Upload & Cloudinary Setup Row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => videoFileInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                        <span>Ina-upload at kino-compress sa Cloudinary ({videoUploadProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-red-400" />
                        <span>Mag-upload ng Video File (Cloudinary)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCloudinaryConfig(p => !p)}
                    className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                    title="I-configure ang Cloudinary Cloud Name at Upload Preset"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Cloudinary Setup</span>
                  </button>
                </div>

                {/* Upload Progress Bar */}
                {isUploadingVideo && (
                  <div className="space-y-1">
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-red-500 h-2 rounded-full transition-all duration-200"
                        style={{ width: `${videoUploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Uploading to Cloudinary...</span>
                      <span className="font-bold text-red-400">{videoUploadProgress}%</span>
                    </div>
                  </div>
                )}

                {/* Cloudinary Settings Drawer */}
                {showCloudinaryConfig && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-sky-400" />
                        Cloudinary API Setup
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCloudinaryConfig(false)}
                        className="text-slate-400 hover:text-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Ipasok ang iyong Cloudinary details para makapag-upload nang direkta mula sa computer. Siguraduhing naka-set sa <strong>Unsigned</strong> ang Upload Preset mo sa Cloudinary Settings.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Cloud Name:</label>
                        <input
                          type="text"
                          value={cloudinaryCloudName}
                          onChange={e => setCloudinaryCloudName(e.target.value)}
                          placeholder="Hal. dxydemo123"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Upload Preset (Unsigned):</label>
                        <input
                          type="text"
                          value={cloudinaryPreset}
                          onChange={e => setCloudinaryPreset(e.target.value)}
                          placeholder="Hal. irosin_preset"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveCloudinaryConfig}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>I-save ang Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Cloudinary Error Notice */}
                {cloudinaryError && (
                  <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cloudinaryError}</span>
                  </div>
                )}

                {/* Video URL Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Video Clip URL (YouTube, Cloudinary, o Direct MP4)
                  </label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={e => {
                      const optimized = optimizeCloudinaryVideoUrl(e.target.value);
                      setForm(p => ({ ...p, videoUrl: optimized }));
                    }}
                    placeholder="https://res.cloudinary.com/.../video.mp4 o https://youtube.com/..."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-red-500"
                    required={form.mediaType === 'VIDEO'}
                  />
                </div>

                {/* Optimization Badge if Cloudinary URL */}
                {form.videoUrl.includes('cloudinary.com') && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      ⚡ Cloudinary Auto-Optimized (<code>q_auto, f_auto, w_1280</code>) — magaan at mabilis mag-play sa mobile data!
                    </span>
                  </div>
                )}

                {/* Video Live Preview */}
                {form.videoUrl.trim() ? (
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 mt-1 flex items-center justify-center">
                    {form.videoUrl.includes('youtube.com') || form.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={form.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                        title="Video Preview"
                        className="w-full h-full border-0"
                      />
                    ) : (
                      <video src={form.videoUrl} controls className="w-full h-full object-contain" />
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="pub" checked={form.isPublished} onChange={e => setForm(p => ({ ...p, isPublished: e.target.checked }))} className="rounded bg-slate-800" />
            <label htmlFor="pub" className="text-sm text-slate-300 cursor-pointer">Published to Residents & Responders</label>
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

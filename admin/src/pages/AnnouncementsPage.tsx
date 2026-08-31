import React, { useEffect, useState, useRef } from 'react';
import {
  Megaphone,
  Plus,
  Calendar,
  Clock,
  Image as ImageIcon,
  CheckCircle2,
  Bell,
  Send,
  Tag,
  Upload,
  FolderOpen,
  X,
  Loader2
} from 'lucide-react';
import { Modal } from '../components/Common/Modal';
import { Api } from '../services/api';

interface Announcement {
  id: string;
  title: string;
  category: string;
  content: string;
  summary?: string;
  affectedBarangays?: string[];
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  imageUrl?: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'ARCHIVED';
  issuedBy?: string;
  notedCount?: number;
  createdAt: string;
}

interface MediaAsset {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
}

const DEFAULT_CATEGORIES = [
  'Kuryente',
  'Tubig',
  'Walang Pasok',
  'Ayuda at Relief',
  'Medical & Bakuna',
  'Pangkalahatan'
];

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // File input ref for local storage upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pangkalahatan');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [what, setWhat] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [who, setWho] = useState('');
  const [why, setWhy] = useState('');
  const [how, setHow] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [issuedBy, setIssuedBy] = useState('MDRRMO Irosin Operations Command');

  useEffect(() => {
    loadData();
    loadMedia();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await Api.getAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.warn('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    try {
      const data = await Api.getAnnouncementMediaLibrary();
      setMediaLibrary(data.mediaLibrary || []);
    } catch (err) {
      console.warn('Error loading media library:', err);
    }
  };

  // Handle image upload from local storage / computer files
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mangyaring pumili ng tamang image file (JPG, PNG, WebP).');
      return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Masyadong malaki ang image file. Ang maximum size ay 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
        setCustomImageUrl('');
        setIsMediaPickerOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const update5W1H = (field: string, value: string) => {
    let w = what;
    let wn = when;
    let wr = where;
    let wh = who;
    let wy = why;
    let hw = how;

    if (field === 'what') { w = value; setWhat(value); }
    else if (field === 'when') { wn = value; setWhen(value); }
    else if (field === 'where') { wr = value; setWhere(value); }
    else if (field === 'who') { wh = value; setWho(value); }
    else if (field === 'why') { wy = value; setWhy(value); }
    else if (field === 'how') { hw = value; setHow(value); }

    const compiled = `What: ${w}\nWhen: ${wn}\nWhere: ${wr}\nWho: ${wh}\nWhy: ${wy}\nHow: ${hw}`;
    setContent(compiled);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = (isCustomCategory ? customCategoryInput.trim() : category.trim()) || 'Pangkalahatan';

    const finalContent = content.trim() || `What: ${what || title}\nWhen: ${when || 'Kasalukuyan at Agaran'}\nWhere: ${where || 'Lahat ng Barangay sa Irosin'}\nWho: ${who || 'Lahat ng Residente'}\nWhy: ${why || 'Paghahanda at kaligtasan'}\nHow: ${how || 'Sundin ang mga tagubilin ng MDRRMO.'}`;

    if (!title || !finalContent) {
      alert('Pakipuno ang pamagat at 5W1H nilalaman ng anunsyo.');
      return;
    }

    try {
      setSubmitting(true);
      const finalImage = customImageUrl || selectedImage;

      await Api.createAnnouncement({
        title,
        category: finalCategory,
        content: finalContent,
        what: what || title,
        when: when,
        where: where,
        who: who,
        why: why,
        how: how,
        eventDate: new Date().toISOString().split('T')[0],
        affectedBarangays: where ? [where] : [],
        imageUrl: finalImage,
        issuedBy,
        status: 'ACTIVE'
      });

      setIsModalOpen(false);
      resetForm();
      await loadData();
      await loadMedia();
      alert('✅ Matagumpay na naipaskil at naipamahagi sa mga residente gamit ang Push Notification!');
    } catch (err: any) {
      alert(`Error: ${err.message || 'Failed to post announcement'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setWhat('');
    setWhen('');
    setWhere('');
    setWho('');
    setWhy('');
    setHow('');
    setContent('');
    setCategory('Pangkalahatan');
    setIsCustomCategory(false);
    setCustomCategoryInput('');
    setSelectedImage('');
    setCustomImageUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Distinct category list from existing data + defaults
  const dynamicCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...announcements.map(a => a.category).filter(Boolean)
    ])
  );

  const filteredAnnouncements =
    filterCategory === 'ALL'
      ? announcements
      : announcements.filter(a => a.category === filterCategory);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2 leading-tight">
            <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 text-sky-400 shrink-0" />
            <span>Mga Opisyal na Anunsyo</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Publish official advisories with local file uploads, reusable banner library, and automated push alerts
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="self-start sm:self-auto flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs sm:text-sm transition shadow-md shadow-sky-500/20 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Gumawa ng Anunsyo</span>
        </button>
      </div>

      {/* Unified Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
            filterCategory === 'ALL'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Lahat</span>
          <span className="text-[10px] opacity-75">({announcements.length})</span>
        </button>

        {dynamicCategories.map(cat => {
          const count = announcements.filter(a => a.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                filterCategory === cat
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>{cat}</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Feed List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Kinukuha ang mga talaan ng anunsyo...</div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">Walang Nakapaskil na Anunsyo sa Kategoryang Ito</h3>
            <p className="text-sm text-slate-400 mt-1">Pindutin ang "Gumawa ng Bagong Anunsyo" sa itaas upang mag-post.</p>
          </div>
        ) : (
          filteredAnnouncements.map(item => {
            return (
              <div key={item.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border text-sky-400 border-sky-500/30 bg-sky-500/10 flex items-center gap-1.5">
                      <Megaphone className="w-3 h-3 text-sky-400" />
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">Pinaskil: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  <span className="text-xs text-slate-400 font-semibold">{item.issuedBy || 'MDRRMO Irosin'}</span>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Photo if available */}
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt="Announcement Banner"
                      className="w-full md:w-56 h-36 object-cover rounded-xl border border-slate-700 shrink-0"
                    />
                  ) : null}

                  <div className="flex-1 space-y-2">
                    <h3 className="text-lg font-bold text-slate-100">{item.title}</h3>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{item.content}</p>

                    {/* Schedule if applicable */}
                    {(item.eventDate || item.startTime) && (
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
                        {item.eventDate && (
                          <span className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-sky-400" />
                            <strong>Petsa:</strong> {new Date(item.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {item.startTime && (
                          <span className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            <strong>Oras:</strong> {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Announcement Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Mag-post ng Opisyal na Anunsyo">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector with Custom Category Support */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Kategorya ng Anunsyo</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {DEFAULT_CATEGORIES.map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setIsCustomCategory(false);
                  }}
                  className={`p-2 rounded-xl text-xs font-bold border text-left transition flex items-center gap-1.5 ${
                    !isCustomCategory && category === cat
                      ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span className="truncate">{cat}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomCategory(true)}
                className={`p-2 rounded-xl text-xs font-bold border text-left transition flex items-center gap-1.5 ${
                  isCustomCategory
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tag className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span className="truncate">+ Custom Kategorya</span>
              </button>
            </div>

            {isCustomCategory && (
              <input
                type="text"
                value={customCategoryInput}
                onChange={e => setCustomCategoryInput(e.target.value)}
                placeholder="I-type ang Custom Category (hal. Palengke Schedule, Libreng Sakay, Pista)..."
                className="w-full px-3 py-2 bg-slate-900 border border-sky-500 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Pamagat ng Anunsyo</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Hal. SORECO II Advance Notice o Walang Pasok sa Lahat ng Antas..."
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          {/* 5W1H Structured Inputs */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                📋 5W1H Impormasyon ng Anunsyo
              </span>
              <span className="text-[10px] text-slate-400">Standard Disaster Bulletin Format</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-1">
                  📌 What (Ano ang Kaganapan)
                </label>
                <input
                  type="text"
                  value={what}
                  onChange={e => update5W1H('what', e.target.value)}
                  placeholder="Hal. Community Flood Preparedness Drill"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                  🕒 When (Petsa at Oras - Manual Text)
                </label>
                <input
                  type="text"
                  value={when}
                  onChange={e => update5W1H('when', e.target.value)}
                  placeholder="Hal. September 5, 2026 – 8:00 AM"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  📍 Where (Lugar / Saan)
                </label>
                <input
                  type="text"
                  value={where}
                  onChange={e => update5W1H('where', e.target.value)}
                  placeholder="Hal. Barangay Covered Court o Lahat ng Barangay"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-1">
                  👥 Who (Sino ang Kalahok / Sakop)
                </label>
                <input
                  type="text"
                  value={who}
                  onChange={e => update5W1H('who', e.target.value)}
                  placeholder="Hal. All residents / Lahat ng residente"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-300 uppercase tracking-wider mb-1">
                  💡 Why (Dahilan / Bakit)
                </label>
                <input
                  type="text"
                  value={why}
                  onChange={e => update5W1H('why', e.target.value)}
                  placeholder="Hal. To prepare residents for possible flooding"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1">
                  🚀 How (Paano / Tagubilin)
                </label>
                <input
                  type="text"
                  value={how}
                  onChange={e => update5W1H('how', e.target.value)}
                  placeholder="Hal. Residents will follow the designated evacuation route"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Local Storage File Upload & Reusable Media Library Section */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Litrato / Official Banner
              </label>
            </div>

            {/* Hidden native file input for local computer/device storage */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleLocalFileUpload}
            />

            {/* Action Buttons: Local Storage Upload + Media Library Reuse */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500 rounded-xl text-xs font-bold text-sky-300 transition"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Mag-upload mula sa Device (Local Files)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMediaPickerOpen(!isMediaPickerOpen)}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-sky-500 rounded-xl text-xs font-bold text-slate-300 transition"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>{isMediaPickerOpen ? 'Itago ang Library' : 'Pumili sa Media Library'}</span>
              </button>
            </div>

            {/* Reusable Gallery Grid */}
            {isMediaPickerOpen && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-400">Piliin ang isang nakaraang banner o template upang hindi na mag-upload muli:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {mediaLibrary.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setSelectedImage(asset.imageUrl);
                        setCustomImageUrl('');
                      }}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border transition group ${
                        selectedImage === asset.imageUrl ? 'border-sky-400 ring-2 ring-sky-500/50' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={asset.imageUrl} alt={asset.title} className="w-full h-20 object-cover" />
                      <div className="absolute inset-0 bg-black/60 p-1 flex items-end">
                        <span className="text-[10px] text-slate-200 font-bold leading-tight truncate">{asset.title}</span>
                      </div>
                      {selectedImage === asset.imageUrl && (
                        <div className="absolute top-1 right-1 bg-sky-500 rounded-full p-0.5 text-white">
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Image Preview */}
            {(selectedImage || customImageUrl) ? (
              <div className="flex items-center gap-3 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <img
                  src={customImageUrl || selectedImage}
                  alt="Selected Preview"
                  className="w-16 h-12 object-cover rounded-md border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 font-bold truncate">Naka-attach na Litrato</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {customImageUrl || (selectedImage.startsWith('data:') ? 'Lokal na file mula sa iyong computer' : selectedImage)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage('');
                    setCustomImageUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-rose-400 font-bold px-2 py-1 bg-rose-500/10 rounded-md hover:bg-rose-500/20 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Alisin
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="O maglagay ng Custom Image URL (hal. https://...)..."
                value={customImageUrl}
                onChange={e => {
                  setCustomImageUrl(e.target.value);
                  setSelectedImage('');
                }}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Nilalaman / Detalye ng Anunsyo</label>
              <button
                type="button"
                onClick={() => {
                  setContent(
`What: Community Flood Preparedness Drill
When: September 5, 2026 – 8:00 AM
Where: Barangay Covered Court
Who: All residents & BDRRMC Responders
Why: To prepare residents for possible flooding
How: Residents will follow the designated evacuation route.`
                  );
                }}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded border border-sky-500/30 transition flex items-center gap-1 cursor-pointer"
              >
                ✨ Gamitin ang 5W1H Format Template
              </button>
            </div>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              placeholder="Isulat ang kumpletong impormasyon o gamitin ang 5W1H Format (What, When, Where, Who, Why, How)..."
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500 resize-none leading-relaxed"
              required
            />
          </div>

          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center gap-2 text-xs text-sky-300">
            <Bell className="w-4 h-4 shrink-0 text-sky-400" />
            <span>Awtomatikong magpapadala ng <strong>Push Notification</strong> sa lahat ng residenteng may app.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
            >
              Kanselahin
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-sky-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{submitting ? 'Ipinapadala...' : 'I-publish & Mag-Push Notification'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

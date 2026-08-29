import React, { useState, useEffect } from 'react';
import {
  Settings,
  CheckCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Shield,
  FileText,
  Info,
  Smartphone,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Cpu,
  Radio,
  Layers,
  X,
  Loader2,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  ShieldAlert,
  Sun,
  Moon
} from 'lucide-react';
import { Api } from '../services/api';
import { Modal } from '../components/Common/Modal';
import { brandingService, AdminBranding, DEFAULT_BRANDING } from '../services/brandingService';
import { themeService, AdminTheme } from '../services/themeService';

export interface ApiIntegrationItem {
  id: string;
  name: string;
  category: string;
  provider: string;
  purpose: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  attributionUrl?: string;
}

export interface TechStackItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

const services = [
  { name: 'Backend API Gateway', status: 'ACTIVE', note: 'Running with Socket.IO Realtime Gateway', url: 'http://localhost:5000/health' },
  { name: 'Firebase Firestore', status: 'ACTIVE', note: 'Cloud Firestore database connected' },
  { name: 'USGS Real-Time Earthquake Monitor', status: 'ACTIVE', note: '250km radius around Irosin & Bulusan (M3.5+ detection)' },
  { name: 'Open-Meteo Weather & Storm Feed', status: 'ACTIVE', note: 'Live satellite & barometric pressure models' },
  { name: 'WebSockets Live Gateway', status: 'ACTIVE', note: 'Instant zero-lag mobile synchronization' },
  { name: 'Official Barangay Data (LGU)', status: 'ACTIVE', note: '28 Barangays of Irosin & Sorsogon Municipalities' },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'APP_PROFILE' | 'APIS_AND_TECH' | 'INTEGRATIONS'>('APP_PROFILE');

  // Theme Appearance State (Dark / Light Mode)
  const [theme, setTheme] = useState<AdminTheme>(() => themeService.getTheme());

  // Admin Branding Customization State (Sidebar & Portal Header)
  const [adminOrgName, setAdminOrgName] = useState(DEFAULT_BRANDING.orgName);
  const [adminOrgSubtitle, setAdminOrgSubtitle] = useState(DEFAULT_BRANDING.orgSubtitle);
  const [adminMunicipality, setAdminMunicipality] = useState(DEFAULT_BRANDING.municipality);
  const [adminProvince, setAdminProvince] = useState(DEFAULT_BRANDING.province);
  const [adminSystemTag, setAdminSystemTag] = useState(DEFAULT_BRANDING.systemTag);
  const [adminLogoUrl, setAdminLogoUrl] = useState<string | null>(null);

  // Form State
  const [appName, setAppName] = useState('');
  const [locationSubtitle, setLocationSubtitle] = useState('');
  const [version, setVersion] = useState('');
  const [commandCenterHotline, setCommandCenterHotline] = useState('');
  const [aboutDescription, setAboutDescription] = useState('');
  const [authority, setAuthority] = useState('');
  const [developmentTeam, setDevelopmentTeam] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [privacyNoticeTitle, setPrivacyNoticeTitle] = useState('');
  const [privacyNoticeContent, setPrivacyNoticeContent] = useState('');
  const [termsTitle, setTermsTitle] = useState('');
  const [termsContent, setTermsContent] = useState('');

  // API Integrations CRUD State
  const [apiIntegrations, setApiIntegrations] = useState<ApiIntegrationItem[]>([]);
  const [editingApi, setEditingApi] = useState<ApiIntegrationItem | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Tech Stack CRUD State
  const [techStack, setTechStack] = useState<TechStackItem[]>([]);
  const [editingTech, setEditingTech] = useState<TechStackItem | null>(null);
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const [savingTech, setSavingTech] = useState(false);
  const [deletingApiId, setDeletingApiId] = useState<string | null>(null);
  const [deletingTechId, setDeletingTechId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
    const unsub = themeService.subscribe((t) => setTheme(t));
    return unsub;
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setMessage(null);

    // 1. Load Local Branding
    const curBranding = brandingService.getBranding();
    setAdminOrgName(curBranding.orgName);
    setAdminOrgSubtitle(curBranding.orgSubtitle);
    setAdminMunicipality(curBranding.municipality);
    setAdminProvince(curBranding.province);
    setAdminSystemTag(curBranding.systemTag);
    setAdminLogoUrl(curBranding.logoUrl);

    try {
      const res = await Api.getAppConfig();
      if (res && res.config) {
        const c = res.config;
        setAppName(c.appName || 'Irosin Disaster Safety App');
        setLocationSubtitle(c.locationSubtitle || 'Irosin, Sorsogon');
        setVersion(c.version || '1.0.0');
        setCommandCenterHotline(c.commandCenterHotline || '0917-123-4567 / MDRRMO 24/7');
        setAboutDescription(c.aboutDescription || '');
        setAuthority(c.authority || 'Municipal Disaster Risk Reduction & Management Office (MDRRMO) - Irosin, Sorsogon');
        setDevelopmentTeam(c.developmentTeam || 'Project Development & Research Team, BSIT');
        setAcademicYear(c.academicYear || '2025 - 2026');
        setPrivacyNoticeTitle(c.privacyNoticeTitle || 'Patakaran sa Privacy ng Datos (RA 10173 Compliance)');
        setPrivacyNoticeContent(c.privacyNoticeContent || '');
        setTermsTitle(c.termsTitle || 'Kasunduan at Tuntunin sa Paggamit (Terms of Service)');
        setTermsContent(c.termsContent || '');
        setApiIntegrations(c.apiIntegrations || []);
        setTechStack(c.techStack || []);
      }
    } catch (err: any) {
      console.error('Failed to load app config:', err);
      setMessage({ type: 'error', text: 'Hindi ma-load ang configuration mula sa server.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ang laki ng logo ay hindi dapat lumagpas sa 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAdminLogoUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setAdminLogoUrl(null);
  };

  const handleResetBranding = () => {
    if (!window.confirm('I-reset ang lahat ng branding at logo sa default (MDRRMO Irosin)?')) return;
    brandingService.resetToDefault();
    setAdminOrgName(DEFAULT_BRANDING.orgName);
    setAdminOrgSubtitle(DEFAULT_BRANDING.orgSubtitle);
    setAdminMunicipality(DEFAULT_BRANDING.municipality);
    setAdminProvince(DEFAULT_BRANDING.province);
    setAdminSystemTag(DEFAULT_BRANDING.systemTag);
    setAdminLogoUrl(null);
    setMessage({ type: 'success', text: '✅ Matagumpay na na-reset ang Branding sa default.' });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Save Admin Branding immediately (live updates sidebar, navbar, login)
    brandingService.saveBranding({
      orgName: adminOrgName.trim() || DEFAULT_BRANDING.orgName,
      orgSubtitle: adminOrgSubtitle.trim() || DEFAULT_BRANDING.orgSubtitle,
      municipality: adminMunicipality.trim() || DEFAULT_BRANDING.municipality,
      province: adminProvince.trim() || DEFAULT_BRANDING.province,
      systemTag: adminSystemTag.trim() || DEFAULT_BRANDING.systemTag,
      logoUrl: adminLogoUrl,
    });

    try {
      const payload = {
        appName,
        locationSubtitle,
        version,
        commandCenterHotline,
        aboutDescription,
        authority,
        developmentTeam,
        academicYear,
        privacyNoticeTitle,
        privacyNoticeContent,
        termsTitle,
        termsContent,
        apiIntegrations,
        techStack
      };
      const res = await Api.updateAppConfig(payload);
      if (res && res.success) {
        setMessage({
          type: 'success',
          text: '✅ Matagumpay na na-save ang Portal Branding at System Configuration!'
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error sa pag-save ng configuration.' });
    } finally {
      setSaving(false);
    }
  };

  // --- API Integrations Handlers ---
  const handleOpenAddApi = () => {
    setEditingApi({
      id: `api-${Date.now()}`,
      name: '',
      category: '',
      provider: '',
      purpose: '',
      status: 'ACTIVE',
      attributionUrl: ''
    });
    setIsApiModalOpen(true);
  };

  const handleOpenEditApi = (api: ApiIntegrationItem) => {
    setEditingApi({ ...api });
    setIsApiModalOpen(true);
  };

  const handleDeleteApi = async (id: string) => {
    if (!window.confirm('Sigurado ka bang nais mong tanggalin ang API integration na ito?')) return;
    const updated = apiIntegrations.filter(a => a.id !== id);
    setApiIntegrations(updated);
    setDeletingApiId(id);
    try {
      await Api.updateAppConfig({
        appName, locationSubtitle, version, commandCenterHotline, aboutDescription, authority, developmentTeam, academicYear,
        privacyNoticeTitle, privacyNoticeContent, termsTitle, termsContent, apiIntegrations: updated, techStack
      });
      setMessage({ type: 'success', text: '✅ Matagumpay na natanggal ang API integration.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error sa pag-update: ' + err?.message });
    } finally {
      setDeletingApiId(null);
    }
  };

  const handleSaveApiModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApi) return;
    let updated: ApiIntegrationItem[];
    const exists = apiIntegrations.find(a => a.id === editingApi.id);
    if (exists) {
      updated = apiIntegrations.map(a => (a.id === editingApi.id ? editingApi : a));
    } else {
      updated = [...apiIntegrations, editingApi];
    }
    setApiIntegrations(updated);
    setSavingApi(true);
    try {
      await Api.updateAppConfig({
        appName, locationSubtitle, version, commandCenterHotline, aboutDescription, authority, developmentTeam, academicYear,
        privacyNoticeTitle, privacyNoticeContent, termsTitle, termsContent, apiIntegrations: updated, techStack
      });
      setMessage({ type: 'success', text: '✅ Matagumpay na na-save ang API integration.' });
      setIsApiModalOpen(false);
      setEditingApi(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error sa pag-update: ' + err?.message });
    } finally {
      setSavingApi(false);
    }
  };

  // --- Tech Stack Handlers ---
  const handleOpenAddTech = () => {
    setEditingTech({
      id: `tech-${Date.now()}`,
      name: '',
      category: '',
      description: ''
    });
    setIsTechModalOpen(true);
  };

  const handleOpenEditTech = (tech: TechStackItem) => {
    setEditingTech({ ...tech });
    setIsTechModalOpen(true);
  };

  const handleDeleteTech = async (id: string) => {
    if (!window.confirm('Sigurado ka bang nais mong tanggalin ang technology item na ito?')) return;
    const updated = techStack.filter(t => t.id !== id);
    setTechStack(updated);
    setDeletingTechId(id);
    try {
      await Api.updateAppConfig({
        appName, locationSubtitle, version, commandCenterHotline, aboutDescription, authority, developmentTeam, academicYear,
        privacyNoticeTitle, privacyNoticeContent, termsTitle, termsContent, apiIntegrations, techStack: updated
      });
      setMessage({ type: 'success', text: '✅ Matagumpay na natanggal ang technology item.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error sa pag-update: ' + err?.message });
    } finally {
      setDeletingTechId(null);
    }
  };

  const handleSaveTechModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    let updated: TechStackItem[];
    const exists = techStack.find(t => t.id === editingTech.id);
    if (exists) {
      updated = techStack.map(t => (t.id === editingTech.id ? editingTech : t));
    } else {
      updated = [...techStack, editingTech];
    }
    setTechStack(updated);
    setSavingTech(true);
    try {
      await Api.updateAppConfig({
        appName, locationSubtitle, version, commandCenterHotline, aboutDescription, authority, developmentTeam, academicYear,
        privacyNoticeTitle, privacyNoticeContent, termsTitle, termsContent, apiIntegrations, techStack: updated
      });
      setMessage({ type: 'success', text: '✅ Matagumpay na na-save ang technology item.' });
      setIsTechModalOpen(false);
      setEditingTech(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Error sa pag-update: ' + err?.message });
    } finally {
      setSavingTech(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2 leading-tight">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 shrink-0" />
            <span>System Configuration & Legal Policies</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            I-manage ang About the System, External APIs (Open-Meteo, USGS, OSM), Tech Stack, at Data Privacy Policies.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 self-start lg:self-auto overflow-x-auto max-w-full custom-scrollbar">
          <button
            onClick={() => setActiveTab('APP_PROFILE')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'APP_PROFILE'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>About & Policies</span>
          </button>
          <button
            onClick={() => setActiveTab('APIS_AND_TECH')}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'APIS_AND_TECH'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>APIs & Tech Stack</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-in fade-in duration-200 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="font-semibold">{message.text}</div>
        </div>
      )}

      {/* TAB 1: APP PROFILE & LEGAL */}
      {activeTab === 'APP_PROFILE' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SECTION 0: Admin Portal & Sidebar Branding (LGU Logo & Organization Name) */}
          <div className="glass-panel p-6 space-y-5 border-sky-500/30 bg-gradient-to-b from-sky-950/20 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-500/15 border border-sky-500/30 rounded-xl text-sky-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Admin Portal & Sidebar Branding</h3>
                  <p className="text-xs text-slate-400">
                    I-customize ang opisyal na logo, pangalan ng ahensya, at munisipyo na lumalabas sa Admin Sidebar, Navbar, at Login Screen.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetBranding}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition self-start sm:self-auto"
                title="Ibalik sa default na MDRRMO Irosin"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>

            {/* Live Sidebar Preview + Logo Upload Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left: Logo Upload Box */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Opisyal na Logo ng Ahensya / LGU
                </label>
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-24 h-24 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center overflow-hidden shadow-inner relative group">
                    {adminLogoUrl ? (
                      <img src={adminLogoUrl} alt="Portal Logo Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-2">
                        <ImageIcon className="w-8 h-8 mb-1 text-slate-600" />
                        <span className="text-[10px] font-bold">Default Shield</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center w-full">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-md shadow-sky-600/20">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{adminLogoUrl ? 'Palitan ang Logo' : 'Mag-upload ng Logo'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {adminLogoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition"
                      >
                        Alisin
                      </button>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500">PNG, JPG, WebP o SVG (Max 2MB)</p>
                </div>
              </div>

              {/* Right: Organization Name & Subtitle Form */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Pangalan ng Ahensya sa Sidebar *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminOrgName}
                      onChange={(e) => setAdminOrgName(e.target.value)}
                      placeholder="Hal. MDRRMO Irosin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-bold focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Sub-title / Tagline sa Sidebar *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminOrgSubtitle}
                      onChange={(e) => setAdminOrgSubtitle(e.target.value)}
                      placeholder="Hal. Disaster Command"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Munisipyo / Bayan *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminMunicipality}
                      onChange={(e) => setAdminMunicipality(e.target.value)}
                      placeholder="Hal. Municipality of Irosin"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Lalawigan (Province) *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminProvince}
                      onChange={(e) => setAdminProvince(e.target.value)}
                      placeholder="Hal. Sorsogon"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      System Version Tag (Lumalabas sa Login & Footer) *
                    </label>
                    <input
                      type="text"
                      required
                      value={adminSystemTag}
                      onChange={(e) => setAdminSystemTag(e.target.value)}
                      placeholder="Hal. MDRRMO SYSTEM V2.0"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  {/* Theme Mode Selector (Dark / Light Mode) */}
                  <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-800/60">
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Tema ng Admin Dashboard (Appearance Mode)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => themeService.setTheme('dark')}
                        className={`p-3 rounded border flex items-center justify-center gap-2.5 font-bold text-xs transition cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-md shadow-sky-500/10'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Moon className="w-4 h-4 text-sky-400" />
                        <span>🌙 Dark Mode (Default)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => themeService.setTheme('light')}
                        className={`p-3 rounded border flex items-center justify-center gap-2.5 font-bold text-xs transition cursor-pointer ${
                          theme === 'light'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-md shadow-amber-500/10'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sun className="w-4 h-4 text-amber-400" />
                        <span>☀️ Light Mode</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Miniature Live Preview Callout */}
                <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-center gap-3">
                  {adminLogoUrl ? (
                    <img src={adminLogoUrl} alt="Preview" className="w-9 h-9 rounded-lg object-contain bg-slate-900 p-0.5 border border-sky-500/30 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 border border-sky-500/30">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  )}
                  <div className="leading-tight truncate">
                    <p className="text-xs font-bold text-slate-200 truncate">{adminOrgName || 'MDRRMO Irosin'}</p>
                    <p className="text-[10px] text-sky-400 font-bold uppercase truncate">{adminOrgSubtitle || 'Disaster Command'}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0">
                    Live Preview
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: About the System & Proponents */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Info className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">1. About the System, Agency & Development Team</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Deskripsyon at Layunin ng Sistema (System Purpose) *
              </label>
              <textarea
                rows={3}
                required
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
                placeholder="Ilarawan ang layunin ng disaster preparedness app..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Awtoridad / Kasosyong Tanggapan *
                </label>
                <input
                  type="text"
                  required
                  value={authority}
                  onChange={(e) => setAuthority(e.target.value)}
                  placeholder="Hal. MDRRMO - Irosin, Sorsogon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Development Team / Proponents *
                </label>
                <input
                  type="text"
                  required
                  value={developmentTeam}
                  onChange={(e) => setDevelopmentTeam(e.target.value)}
                  placeholder="Hal. Project Research & Development Team, BSIT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Academic / Release Year *
                </label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Hal. 2025 - 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Data Privacy Notice */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-slate-100">2. Data Privacy Notice (Republic Act No. 10173 Compliance)</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Pamagat ng Privacy Notice
              </label>
              <input
                type="text"
                required
                value={privacyNoticeTitle}
                onChange={(e) => setPrivacyNoticeTitle(e.target.value)}
                placeholder="Patakaran sa Privacy ng Datos..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Buong Nilalaman ng Patakaran sa Privacy (Full Terms) *
              </label>
              <textarea
                rows={7}
                required
                value={privacyNoticeContent}
                onChange={(e) => setPrivacyNoticeContent(e.target.value)}
                placeholder="Ilagay ang probisyon ukol sa data collection, use, retention, at user rights..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Section 3: Terms of Service */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100">3. Terms of Service & Responsible Reporting</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Pamagat ng Tuntunin
              </label>
              <input
                type="text"
                required
                value={termsTitle}
                onChange={(e) => setTermsTitle(e.target.value)}
                placeholder="Kasunduan at Tuntunin sa Paggamit..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Buong Nilalaman ng Tuntunin (Full Terms) *
              </label>
              <textarea
                rows={7}
                required
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                placeholder="Ilagay ang mga patakaran sa responsableng pag-uulat at pananagutan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 font-mono text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || loading}
              className="bg-sky-500 hover:bg-sky-400 text-white font-black text-sm px-6 py-3 rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sine-save...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  I-save ang Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}
      {activeTab === 'APIS_AND_TECH' && (
        <div className="space-y-8">
          {/* SECTION A: EXTERNAL APIS & DATA PROVIDERS CRUD */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">Integrated APIs & Data Sources (Thesis & System Attribution)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Listahan ng mga opisyal na weather, seismic, geographic, at push notification APIs na ginagamit ng mobile app.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddApi}
                className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-sky-500/20"
              >
                <Plus className="w-4 h-4" />
                Magdagdag ng API
              </button>
            </div>

            {apiIntegrations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Walang nakalistang API. Pindutin ang "+ Magdagdag ng API" upang mag-set up.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {apiIntegrations.map((api) => (
                  <div
                    key={api.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{api.name}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            api.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : api.status === 'MAINTENANCE'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {api.status}
                        </span>
                        <span className="text-xs text-sky-400 font-semibold bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/40">
                          {api.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300">Provider:</strong> {api.provider}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300">Gamit / Layunin:</strong> {api.purpose}
                      </p>
                      {api.attributionUrl && (
                        <a
                          href={api.attributionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline pt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {api.attributionUrl}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleOpenEditApi(api)}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                        title="I-edit ang API"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApi(api.id)}
                        disabled={deletingApiId === api.id}
                        className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-400 hover:text-rose-300 hover:bg-rose-900/60 transition-colors disabled:opacity-50"
                        title="Burahin ang API"
                      >
                        {deletingApiId === api.id ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION B: CORE TECH STACK & TOOLS CRUD */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">Development Tools & Core Tech Stack</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mga teknolohiya at framework na ginamit sa paggawa ng Mobile Client, Backend Server, at Database.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddTech}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-lg shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                Magdagdag ng Tech Tool
              </button>
            </div>

            {techStack.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Walang nakalistang tech stack. Pindutin ang "+ Magdagdag ng Tech Tool".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {techStack.map((tech) => (
                  <div
                    key={tech.id}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{tech.name}</span>
                      </div>
                      <span className="inline-block text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                        {tech.category}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed mt-1">{tech.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleOpenEditTech(tech)}
                        className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                        title="I-edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTech(tech.id)}
                        disabled={deletingTechId === tech.id}
                        className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
                        title="Burahin"
                      >
                        {deletingTechId === tech.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SERVER INTEGRATION & NETWORK STATUS */}
      {activeTab === 'INTEGRATIONS' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-sm text-amber-300 mb-6">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong>Security Protocol:</strong> Never expose Firebase Admin, JWT, or SMS API keys to the browser client or mobile. All sensitive credentials remain securely encapsulated in <code>backend/.env</code>.
            </div>
          </div>

          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.name} className="glass-panel p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg shrink-0 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-100">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.note}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border uppercase shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  {s.status}
                </span>
              </div>
            ))}
          </div>

          <div className="glass-panel p-6 space-y-3">
            <h3 className="text-base font-bold text-slate-100">Quick Reference: Environment Files</h3>
            <div className="space-y-2 text-xs font-mono">
              {[
                ['backend/.env', 'PORT, JWT_SECRET, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, SMS_API_KEY, SMS_API_URL, SMS_SENDER_NAME, GOOGLE_MAPS_API_KEY'],
                ['mobile/.env', 'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY, EXPO_PUBLIC_API_URL'],
                ['admin/.env', 'VITE_API_URL'],
              ].map(([file, vars]) => (
                <div key={file} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <p className="text-sky-400 font-bold mb-1">{file}</p>
                  <p className="text-slate-400 leading-relaxed">{vars}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">⚠ Never commit .env files to Git. Keep credentials safe.</p>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT API INTEGRATION */}
      <Modal
        isOpen={isApiModalOpen}
        onClose={() => {
          setIsApiModalOpen(false);
          setEditingApi(null);
        }}
        title={editingApi && apiIntegrations.some(a => a.id === editingApi.id) ? 'I-edit ang API Integration' : 'Magdagdag ng Bagong API Integration'}
      >
        {editingApi && (
          <form onSubmit={handleSaveApiModal} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Pangalan ng API / Service</label>
              <input
                type="text"
                value={editingApi.name}
                onChange={e => setEditingApi({ ...editingApi, name: e.target.value })}
                placeholder="Hal. Open-Meteo Weather API"
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Kategorya</label>
                <input
                  type="text"
                  value={editingApi.category}
                  onChange={e => setEditingApi({ ...editingApi, category: e.target.value })}
                  placeholder="Hal. Weather, Seismic, Maps"
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editingApi.status}
                  onChange={e => setEditingApi({ ...editingApi, status: e.target.value as any })}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="DEPRECATED">DEPRECATED</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Opisyal na Provider / Source</label>
              <input
                type="text"
                value={editingApi.provider}
                onChange={e => setEditingApi({ ...editingApi, provider: e.target.value })}
                placeholder="Hal. Open-Meteo GmbH / PAGASA"
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Gamit at Layunin sa App</label>
              <textarea
                value={editingApi.purpose}
                onChange={e => setEditingApi({ ...editingApi, purpose: e.target.value })}
                rows={2}
                placeholder="Hal. Real-time temperature, wind speed, at rain forecast para sa Irosin..."
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Attribution / Documentation URL (Opsyonal)</label>
              <input
                type="url"
                value={editingApi.attributionUrl || ''}
                onChange={e => setEditingApi({ ...editingApi, attributionUrl: e.target.value })}
                placeholder="https://open-meteo.com"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={savingApi}
                onClick={() => {
                  setIsApiModalOpen(false);
                  setEditingApi(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
              >
                Kanselahin
              </button>
              <button
                type="submit"
                disabled={savingApi}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingApi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{editingApi && apiIntegrations.some(a => a.id === editingApi.id) ? 'I-save ang Pagbabago' : 'Idagdag ang API'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: ADD / EDIT TECH STACK */}
      <Modal
        isOpen={isTechModalOpen}
        onClose={() => {
          setIsTechModalOpen(false);
          setEditingTech(null);
        }}
        title={editingTech && techStack.some(t => t.id === editingTech.id) ? 'I-edit ang Tech Tool' : 'Magdagdag ng Tech Tool'}
      >
        {editingTech && (
          <form onSubmit={handleSaveTechModal} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Pangalan ng Tool / Framework</label>
              <input
                type="text"
                value={editingTech.name}
                onChange={e => setEditingTech({ ...editingTech, name: e.target.value })}
                placeholder="Hal. React Native (Expo) o Node.js"
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Kategorya</label>
              <input
                type="text"
                value={editingTech.category}
                onChange={e => setEditingTech({ ...editingTech, category: e.target.value })}
                placeholder="Hal. Mobile Frontend, Backend Server, Database, Cloud Storage"
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Deskripsyon at Papel sa Arkitektura</label>
              <textarea
                value={editingTech.description}
                onChange={e => setEditingTech({ ...editingTech, description: e.target.value })}
                rows={3}
                placeholder="Hal. Cross-platform mobile client engine na may TypeScript support..."
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={savingTech}
                onClick={() => {
                  setIsTechModalOpen(false);
                  setEditingTech(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
              >
                Kanselahin
              </button>
              <button
                type="submit"
                disabled={savingTech}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingTech ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{editingTech && techStack.some(t => t.id === editingTech.id) ? 'I-save ang Pagbabago' : 'Idagdag ang Tech'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

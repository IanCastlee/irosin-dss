import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Eye,
  Plus,
  Upload,
  Check,
  Loader2,
  Bell,
  BellRing,
  Volume2,
  MapPin,
  Car,
  Trash2
} from 'lucide-react';
import { Api } from '../services/api';
import { DisasterReport, Barangay } from '../types';
import { Modal } from '../components/Common/Modal';
import { CardSkeleton } from '../components/Common/LoadingSpinner';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  VERIFIED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  UNDER_CLEARING: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  REJECTED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  RESOLVED: 'bg-slate-700 text-slate-400 border-slate-600',
};

const reportTypeIcons: Record<string, string> = {
  FLOODING: '🌊',
  BLOCKED_ROAD: '🚧',
  DAMAGED_ROAD: '🛣️',
  LANDSLIDE: '⛰️',
  DAMAGED_EVACUATION_CENTER: '🏚️',
  UNSAFE_ROUTE: '⚠️',
  OTHER: '📋'
};

// Web Audio API chime generator for incoming citizen reports
const playAlertChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Second higher tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.55);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
};

export const DisasterReports: React.FC = () => {
  const [reports, setReports] = useState<DisasterReport[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisasterReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [affectedRouteInput, setAffectedRouteInput] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'UNDER_CLEARING' | 'RESOLVED' | 'REJECTED'>('ALL');
  const [previewPhotoData, setPreviewPhotoData] = useState<{ uri: string; label?: string; stage?: string; uploadedBy?: string } | null>(null);
  const [actionPhotos, setActionPhotos] = useState<string[]>([]);

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [newReportAlert, setNewReportAlert] = useState<{ id: string; title: string; barangay: string } | null>(null);
  const knownReportIdsRef = useRef<Set<string>>(new Set());

  // Compose Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [newReport, setNewReport] = useState({
    reportType: 'LANDSLIDE',
    barangayId: '',
    barangayName: '',
    locationDescription: '',
    description: '',
    affectedRoute: '',
    status: 'VERIFIED',
    adminNotes: 'Inisyu at kinumpirma ng MDRRMO Operations Command Center',
    imageUrl: '',
    photos: [] as string[]
  });

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  useEffect(() => {
    loadInitialReports();
    loadBarangays();

    // Check Notification Permission
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }

    // Auto-polling interval for incoming citizen reports
    const interval = setInterval(() => {
      checkForNewReports();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Hindi suportado ng browser na ito ang desktop notifications.');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        playAlertChime();
        new Notification('🔔 MDRRMO Disaster Command', {
          body: 'Naka-enable na ang Live Push Notifications para sa mga ulat ng residente!',
          icon: '/favicon.ico'
        });
      } else {
        setNotificationsEnabled(false);
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  const checkForNewReports = async () => {
    try {
      const res = await Api.getDisasterReports(undefined, 20);
      if (res && res.disasterReports && res.disasterReports.length > 0) {
        const incoming = res.disasterReports;
        
        // Find if there are any new PENDING reports from citizens not seen before
        const brandNewPending = incoming.filter(
          r => r.status === 'PENDING' && !knownReportIdsRef.current.has(r.id)
        );

        if (brandNewPending.length > 0) {
          const latest = brandNewPending[0];
          playAlertChime();

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🚨 Bagong Disaster Report mula sa Residente!`, {
              body: `Brgy. ${latest.barangayName}: ${(latest.reportType || 'Hazard').replace(/_/g, ' ')} - ${latest.locationDescription}`,
              icon: '/favicon.ico'
            });
          }

          setNewReportAlert({
            id: latest.id,
            title: (latest.reportType || 'Hazard').replace(/_/g, ' '),
            barangay: latest.barangayName
          });

          // Auto-hide banner after 8 seconds
          setTimeout(() => setNewReportAlert(null), 8000);
        }

        // Update Ref & State
        incoming.forEach(r => knownReportIdsRef.current.add(r.id));
        setReports(incoming);
      }
    } catch {
      // Background poll failure ignore
    }
  };

  const loadBarangays = async () => {
    try {
      const res = await Api.getBarangays();
      if (res && res.barangays) {
        setBarangays(res.barangays);
        if (res.barangays.length > 0 && !newReport.barangayId) {
          setNewReport(prev => ({
            ...prev,
            barangayId: res.barangays[0].id,
            barangayName: res.barangays[0].name
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load barangays:', e);
    }
  };

  const loadInitialReports = async () => {
    setLoading(true);
    try {
      const res = await Api.getDisasterReports(undefined, 50);
      if (res && res.disasterReports) {
        setReports(res.disasterReports);
        res.disasterReports.forEach(r => knownReportIdsRef.current.add(r.id));
        setNextCursor(res.nextCursor || null);
        setHasMore(!!res.hasMore);
      }
    } catch {
      // Keep existing reports
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await Api.getDisasterReports(nextCursor, 50);
      if (res && res.disasterReports) {
        setReports(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.disasterReports.filter(d => !existingIds.has(d.id));
          newItems.forEach(r => knownReportIdsRef.current.add(r.id));
          return [...prev, ...newItems];
        });
        setNextCursor(res.nextCursor || null);
        setHasMore(!!res.hasMore);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const handleOpenActionModal = (r: DisasterReport) => {
    setSelected(r);
    setAdminNotes(r.adminNotes || '');
    setAffectedRouteInput(r.affectedRoute || '');
    setActionPhotos([]);
  };

  const handleActionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setActionPhotos(prev => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selected) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Walang Koneksyon sa Internet!\nKailangan ng aktibong internet connection upang ma-update ang katayuan ng ulat.');
      return;
    }

    setStatusLoading(status);
    try {
      const res = await Api.updateReportStatus(
        selected.id,
        status,
        adminNotes,
        affectedRouteInput || undefined,
        actionPhotos.length > 0 ? actionPhotos : undefined
      );
      setReports(prev => prev.map(r => r.id === selected.id ? (res.disasterReport || { ...r, status: status as any, adminNotes, affectedRoute: affectedRouteInput }) : r));
      setSelected(null);
      setAdminNotes('');
      setAffectedRouteInput('');
      setActionPhotos([]);
    } catch (err: any) {
      alert('⚠️ Hindi ma-update ang ulat! Pakisuri ang iyong koneksyon sa internet: ' + (err?.message || 'Network request failed'));
    } finally {
      setStatusLoading(null);
    }
  };

  const handleDeleteReport = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Walang Koneksyon sa Internet!\nKailangan ng aktibong internet connection upang magbura ng ulat.');
      return;
    }

    if (!window.confirm('Sigurado ka bang nais mong burahin ang ulat na ito? Mabubura ito sa database at sa listahan.')) {
      return;
    }

    setDeletingReportId(id);
    try {
      await Api.deleteDisasterReport(id);
      setReports(prev => prev.filter(r => r.id !== id));
      if (selected && selected.id === id) {
        setSelected(null);
      }
    } catch (err: any) {
      alert('⚠️ Error sa pagbura ng ulat: ' + (err?.message || 'Pakisuri ang internet connection'));
    } finally {
      setDeletingReportId(null);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setNewReport(prev => ({
          ...prev,
          imageUrl: base64,
          photos: [base64]
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.barangayId || !newReport.locationDescription || !newReport.description) {
      alert('Paki-puno ang Barangay, Eksaktong Lokasyon, at Deskripsyon ng perwisyo.');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert('⚠️ Walang Koneksyon sa Internet!\nKailangan ng aktibong internet connection upang mag-publish ng bagong ulat.');
      return;
    }

    setSubmitting(true);
    try {
      const b = barangays.find(item => item.id === newReport.barangayId);
      const payload = {
        ...newReport,
        barangayName: b ? b.name : newReport.barangayName,
        photos: newReport.imageUrl ? [newReport.imageUrl] : []
      };

      const res = await Api.createDisasterReport(payload);
      if (res && res.disasterReport) {
        setReports(prev => [res.disasterReport, ...prev]);
        knownReportIdsRef.current.add(res.disasterReport.id);
        setShowCreateModal(false);
        // Reset form
        setNewReport({
          reportType: 'LANDSLIDE',
          barangayId: barangays[0]?.id || '',
          barangayName: barangays[0]?.name || '',
          locationDescription: '',
          description: '',
          affectedRoute: '',
          status: 'VERIFIED',
          adminNotes: 'Inisyu at kinumpirma ng MDRRMO Operations Command Center',
          imageUrl: '',
          photos: []
        });
      }
    } catch (err: any) {
      alert(`Error creating disaster report: ${err?.message || 'Failed to submit'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.status === filter);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Toast Alert for Incoming Citizen Report */}
      {newReportAlert && (
        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-rose-600 to-amber-600 text-white rounded-2xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 animate-pulse text-yellow-200" />
            <div>
              <strong className="text-xs sm:text-sm font-black tracking-wide">BAGONG ULAT MULA SA RESIDENTE!</strong>
              <p className="text-[11px] sm:text-xs text-rose-100">Brgy. {newReportAlert.barangay} • {newReportAlert.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFilter('PENDING');
              setNewReportAlert(null);
            }}
            className="self-end sm:self-auto px-3 py-1.5 bg-white text-rose-700 text-xs font-black rounded-xl hover:bg-rose-50 transition shrink-0"
          >
            I-review Ngayon
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Disaster & Road Hazard Reports</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Ulat ng perwisyo sa daan mula sa mga residente at opisyal na ulat ng MDRRMO</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Real-time Notification Toggle */}
          <button
            onClick={requestNotificationPermission}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              notificationsEnabled
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="I-enable ang Browser Push & Audio Chime para sa mga bagong ulat"
          >
            {notificationsEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <span>Live Alert: On</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Push Alert</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold px-3.5 py-2 rounded-xl shadow-md shadow-sky-600/30 transition text-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Mag-ulat (Admin)</span>
          </button>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-amber-300">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
        <div><strong>Disaster Action & Clearing Protocol:</strong> Ang mga ulat na <em>VERIFIED</em> at <em>UNDER CLEARING</em> ay awtomatikong lumalabas sa mobile app at nagpapadala ng push notification sa mga residente.</div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {(['ALL', 'PENDING', 'VERIFIED', 'UNDER_CLEARING', 'RESOLVED', 'REJECTED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${filter === f ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>{f.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Feed Listing */}
      <div className="space-y-3">
        {loading ? (
          <CardSkeleton count={3} />
        ) : filtered.length === 0 ? (
          <div className="glass-panel p-12 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
            <p>Walang nakitang ulat para sa kategoryang ito.</p>
          </div>
        ) : (
          filtered.map(r => {
            const stageRank: Record<string, number> = {
              RESOLVED: 4,
              UNDER_CLEARING: 3,
              IMPASSABLE: 2,
              INCIDENT: 1,
              PENDING: 0,
            };

            // Deduplicate and sort images so the latest stage photo is in front
            const uniquePhotos = Array.from(
              new Set([r.imageUrl, ...(r.photos || [])].filter(Boolean) as string[])
            ).sort((a, b) => {
              const metaA = r.photoItems?.find(pi => pi.uri === a);
              const metaB = r.photoItems?.find(pi => pi.uri === b);
              const stageA = metaA?.stage || (r.status === 'PENDING' ? 'PENDING' : 'INCIDENT');
              const stageB = metaB?.stage || (r.status === 'PENDING' ? 'PENDING' : 'INCIDENT');
              return (stageRank[stageB] || 0) - (stageRank[stageA] || 0);
            });

            return (
              <div key={r.id} className="glass-panel p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">{reportTypeIcons[r.reportType] || '📋'}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-100 text-base">{(r.reportType || 'Hazard').replace(/_/g, ' ')}</span>
                        {r.barangayName && r.barangayName.trim() ? (
                          <span className="text-xs text-slate-400">Brgy. {r.barangayName}</span>
                        ) : null}
                        <span className={`px-2.5 py-0.5 text-[11px] font-black rounded-full border ${statusColors[r.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {r.status === 'PENDING' ? '⏳ PENDING' :
                           r.status === 'VERIFIED' ? '🚨 INCIDENT' :
                           r.status === 'UNDER_CLEARING' ? '🚧 CLEARING' :
                           r.status === 'RESOLVED' ? '✅ RESOLVED' :
                           r.status === 'IMPASSABLE' ? '⛔ IMPASSABLE' :
                           r.status === 'REJECTED' ? '❌ REJECTED' : r.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">📍 {r.locationDescription}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenActionModal(r)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> Action / Update
                    </button>
                    <button
                      onClick={(e) => handleDeleteReport(r.id, e)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg transition"
                      title="Burahin ang ulat na ito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">{r.description}</p>

                {/* Optional Affected Route Box */}
                {r.affectedRoute && (
                  <div className="flex items-center gap-2 text-xs bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60">
                    <Car className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-amber-400 font-bold">Apektadong Rota: </span>
                    <span className="text-slate-300">{r.affectedRoute}</span>
                  </div>
                )}

                {/* Responder / Admin Action Details */}
                {(r.verifiedBy || r.adminNotes) && (
                  <div className="bg-sky-950/30 border border-sky-800/40 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-bold text-sky-400">🛡️ Gumawa ng Aksyon:</span>
                      <span className="font-black text-slate-100 bg-sky-500/20 px-2.5 py-0.5 rounded-md border border-sky-500/30">
                        {r.verifiedBy || 'MDRRMO Command Center'}
                      </span>
                    </div>
                    {r.adminNotes && (
                      <p className="text-xs text-slate-300 pl-3 border-l-2 border-sky-500/40 mt-1">
                        <strong className="text-slate-400">Aksyon / Detalye: </strong>
                        {r.adminNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Deduplicated Photos with Stage Signatures */}
                {uniquePhotos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                    {uniquePhotos.map((img, idx) => {
                      const itemMeta = r.photoItems?.find(pi => pi.uri === img) || r.photoItems?.[idx];
                      const effectiveStage = itemMeta?.stage
                        ? (itemMeta.stage === 'PENDING' && r.status !== 'PENDING' ? 'INCIDENT' : itemMeta.stage)
                        : (r.status === 'PENDING' ? 'PENDING' : 'INCIDENT');

                      const isResolved = effectiveStage === 'RESOLVED';
                      const isClearing = effectiveStage === 'UNDER_CLEARING';
                      const isPending = effectiveStage === 'PENDING';

                      const badgeBg = isResolved ? 'bg-emerald-600/90 text-white border-emerald-400' :
                                      isClearing ? 'bg-sky-600/90 text-white border-sky-400' :
                                      isPending ? 'bg-amber-600/90 text-white border-amber-400' :
                                      'bg-orange-600/90 text-white border-orange-400';

                      const badgeLabel = isResolved ? '✅ LIGTAS NA' :
                                         isClearing ? '🚧 CLEARING' :
                                         isPending ? '⏳ PENDING' :
                                         '🚨 INSIDENTE';

                      return (
                        <div
                          key={idx}
                          onClick={() => setPreviewPhotoData({
                            uri: img,
                            stage: effectiveStage,
                            label: badgeLabel,
                            uploadedBy: itemMeta?.uploadedBy || r.reporterName
                          })}
                          className="relative group cursor-pointer shrink-0 rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition"
                        >
                          <img
                            src={img}
                            alt="Disaster Photo"
                            className="w-28 h-20 object-cover group-hover:scale-105 transition"
                          />
                          <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-wide border shadow-md flex items-center gap-1 ${badgeBg}`}>
                            {badgeLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60 flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span>Iniulat ni: <strong className="text-slate-400">{r.reporterName || 'Citizen'}</strong> ({r.reporterPhone || 'N/A'})</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/90 text-sky-400 border border-slate-700/80 text-[11px] font-black">
                      👍 {r.notedCount || 0} Noted
                    </span>
                  </div>
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                </div>
              </div>
            );
          })
        )}

        {hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            >
              {loadingMore ? 'Naglo-load...' : 'Mag-load ng Karagdagang Ulat'}
            </button>
          </div>
        )}
      </div>

      {/* CREATE MODAL (ADMIN) */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Mag-compose ng Ulat ng Disaster / Perwisyo sa Daan">
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Uri ng Disaster / Perwisyo</label>
              <select
                value={newReport.reportType}
                onChange={e => setNewReport(prev => ({ ...prev, reportType: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="LANDSLIDE">⛰️ Landslide / Guho ng Lupa</option>
                <option value="FLOODING">🌊 Baha / Flooding</option>
                <option value="BLOCKED_ROAD">🚧 Baradong Daanan (Natumbang Puno / Poste)</option>
                <option value="DAMAGED_ROAD">🛣️ Sirang Kalsada / Bitak</option>
                <option value="UNSAFE_ROUTE">⚠️ Mapanganib na Rota</option>
                <option value="DAMAGED_EVACUATION_CENTER">🏚️ Sirang Evacuation Center</option>
                <option value="OTHER">📋 Iba Pa</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Apektadong Barangay</label>
              <select
                value={newReport.barangayId}
                onChange={e => {
                  const b = barangays.find(item => item.id === e.target.value);
                  setNewReport(prev => ({
                    ...prev,
                    barangayId: e.target.value,
                    barangayName: b ? b.name : ''
                  }));
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {barangays.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Eksaktong Lokasyon / Landmark</label>
            <input
              type="text"
              placeholder="Hal. Maharlika Highway tapat ng Gabao Bridge"
              value={newReport.locationDescription}
              onChange={e => setNewReport(prev => ({ ...prev, locationDescription: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Deskripsyon ng Perwisyo & Babala</label>
            <textarea
              placeholder="Ilarawan ang pinsala sa kalsada, lalim ng baha, o banta sa kaligtasan..."
              value={newReport.description}
              onChange={e => setNewReport(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              required
            />
          </div>

          {/* Optional Affected Route Only */}
          <div>
            <label className="text-xs font-bold text-amber-400 block mb-1">🚗 Apektadong Rota (Opsyonal)</label>
            <input
              type="text"
              placeholder="Hal. Gabao to Central Town / Maharlika Bypass"
              value={newReport.affectedRoute}
              onChange={e => setNewReport(prev => ({ ...prev, affectedRoute: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Litrato ng Perwisyo / Pinsala</label>
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition">
                <Upload className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-slate-300">Mag-upload mula sa Device (Local Photo)</span>
                <input type="file" accept="image/*" onChange={handleLocalFileUpload} className="hidden" />
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="O mag-paste ng Image URL dito..."
                  value={newReport.imageUrl}
                  onChange={e => setNewReport(prev => ({ ...prev, imageUrl: e.target.value, photos: [e.target.value] }))}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                />
              </div>

              {newReport.imageUrl && (
                <div className="relative inline-block mt-2">
                  <img src={newReport.imageUrl} alt="Preview" className="w-32 h-20 object-cover rounded-lg border border-sky-500/50" />
                  <button
                    type="button"
                    onClick={() => setNewReport(prev => ({ ...prev, imageUrl: '', photos: [] }))}
                    className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Inisyal na Katayuan (Status)</label>
              <select
                value={newReport.status}
                onChange={e => setNewReport(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-bold text-emerald-400"
              >
                <option value="VERIFIED">✓ VERIFIED (Lalabas agad sa Mobile)</option>
                <option value="UNDER_CLEARING">🚧 UNDER CLEARING (Inaayos)</option>
                <option value="RESOLVED">✅ RESOLVED (Ligtas at Naayos Na)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">MDRRMO Action Notes</label>
              <input
                type="text"
                placeholder="Hal. Nagpadala na ng heavy equipment..."
                value={newReport.adminNotes}
                onChange={e => setNewReport(prev => ({ ...prev, adminNotes: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition"
            >
              Kanselahin
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-sky-600/30 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{submitting ? 'Nai-publish...' : 'I-publish ang Ulat'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* UPDATE STATUS & ACTION MODAL */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="I-verify o I-update ang Katayuan ng Ulat">
        {selected && (
          <div className="space-y-4">
            <div className="glass-panel p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{reportTypeIcons[selected.reportType] || '📋'}</span>
                  <span className="font-bold text-slate-100">{selected.reportType.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-slate-400">({selected.barangayName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Kasalukuyang Katayuan:</span>
                  <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${statusColors[selected.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {selected.status === 'PENDING' ? '⏳ PENDING' :
                     selected.status === 'VERIFIED' ? '🚨 INCIDENT' :
                     selected.status === 'UNDER_CLEARING' ? '🚧 CLEARING' :
                     selected.status === 'RESOLVED' ? '✅ RESOLVED' :
                     selected.status === 'IMPASSABLE' ? '⛔ IMPASSABLE' :
                     selected.status === 'REJECTED' ? '❌ REJECTED' : selected.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300">{selected.description}</p>
              <p className="text-xs text-slate-400">📍 {selected.locationDescription}</p>
            </div>

            <div>
              <label className="text-xs font-bold text-amber-400 block mb-1">🚗 Apektadong Rota (Opsyonal)</label>
              <input
                type="text"
                value={affectedRouteInput}
                onChange={e => setAffectedRouteInput(e.target.value)}
                placeholder="Hal. Maharlika Highway Bypass ➔ Irosin Central"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">MDRRMO Action Notes (Makikita ng Publiko)</label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Hal. On-site na ang clearing team; asahan ang pagbubukas ng 3PM..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            {/* Attach Action Progress Photos (Clearing or Resolved Proof) */}
            <div>
              <label className="text-xs font-bold text-sky-400 block mb-1">📸 Maglakip ng Litrato ng Aksyon (Clearing o Resolved Proof)</label>
              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-300">Pumili ng Litrato mula sa Computer</span>
                  <input type="file" accept="image/*" onChange={handleActionFileUpload} className="hidden" />
                </label>

                {actionPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {actionPhotos.map((img, i) => (
                      <div key={i} className="relative inline-block">
                        <img src={img} alt="Action Proof" className="w-20 h-16 object-cover rounded-lg border border-sky-500/60" />
                        <button
                          type="button"
                          onClick={() => setActionPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => handleUpdateStatus('VERIFIED')}
                disabled={!!statusLoading || !!deletingReportId}
                className="px-3 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {statusLoading === 'VERIFIED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>✓ I-verify</span>
              </button>
              <button
                onClick={() => handleUpdateStatus('UNDER_CLEARING')}
                disabled={!!statusLoading || !!deletingReportId}
                className="px-3 py-2.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {statusLoading === 'UNDER_CLEARING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>🚧 Inaayos / Clearing</span>
              </button>
              <button
                onClick={() => handleUpdateStatus('RESOLVED')}
                disabled={!!statusLoading || !!deletingReportId}
                className="px-3 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {statusLoading === 'RESOLVED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>✅ Na-resolba Na</span>
              </button>
              <button
                onClick={() => handleUpdateStatus('REJECTED')}
                disabled={!!statusLoading || !!deletingReportId}
                className="px-3 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {statusLoading === 'REJECTED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>✕ I-reject / Spam</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => handleDeleteReport(selected.id)}
                disabled={!!deletingReportId || !!statusLoading}
                className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
              >
                {deletingReportId === selected.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>Burahin ang Report na Ito</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* PREVIEW PHOTO MODAL */}
      <Modal isOpen={!!previewPhotoData} onClose={() => setPreviewPhotoData(null)} title="Litrato ng Disaster Report">
        {previewPhotoData && (
          <div className="space-y-3 p-2">
            <div className="flex items-center justify-between gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
              <span className="font-bold text-slate-200">
                Signature Stage: <span className="font-black text-sky-400">{previewPhotoData.label || '🚨 INSIDENTE'}</span>
              </span>
              {previewPhotoData.uploadedBy && (
                <span className="text-slate-400">
                  Kumuha: <strong className="text-slate-300">{previewPhotoData.uploadedBy}</strong>
                </span>
              )}
            </div>
            <div className="flex justify-center">
              <img src={previewPhotoData.uri} alt="Enlarged disaster report" className="max-h-[70vh] rounded-xl object-contain" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

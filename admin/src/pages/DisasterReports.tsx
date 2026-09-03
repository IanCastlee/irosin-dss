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
import { AdminSocket } from '../services/socketService';
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

  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

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

    // Real-time: listen for new reports and status updates via Socket.IO (0 polling)
    const unsubNew = AdminSocket.on('new_disaster_report', (data: any) => {
      const report = data?.report || data?.data || data;
      if (report && !knownReportIdsRef.current.has(report.id)) {
        knownReportIdsRef.current.add(report.id);
        playAlertChime();

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🚨 Bagong Disaster Report mula sa Residente!`, {
            body: `Brgy. ${report.barangayName}: ${(report.reportType || 'Hazard').replace(/_/g, ' ')} - ${report.locationDescription || ''}`,
            icon: '/favicon.ico'
          });
        }

        setNewReportAlert({
          id: report.id,
          title: (report.reportType || 'Hazard').replace(/_/g, ' '),
          barangay: report.barangayName
        });
        setTimeout(() => setNewReportAlert(null), 8000);
      }
      loadInitialReports();
    });

    const unsubNewUpper = AdminSocket.on('NEW_DISASTER_REPORT', (data: any) => {
      const report = data?.report || data?.data || data;
      if (report && !knownReportIdsRef.current.has(report.id)) {
        knownReportIdsRef.current.add(report.id);
        playAlertChime();
        setNewReportAlert({
          id: report.id,
          title: (report.reportType || 'Hazard').replace(/_/g, ' '),
          barangay: report.barangayName
        });
        setTimeout(() => setNewReportAlert(null), 8000);
      }
      loadInitialReports();
    });

    const unsubUpdate = AdminSocket.on('report_status_updated', (data: any) => {
      if (data?.id) {
        setReports(prev =>
          prev.map(r => (r.id === data.id ? { ...r, ...data.report, status: data.status } : r))
        );
        if (selected && selected.id === data.id) {
          setSelected(prev => (prev ? { ...prev, ...data.report, status: data.status } : null));
        }
      }
    });

    const unsubUpdateUpper = AdminSocket.on('DISASTER_REPORT_UPDATED', (data: any) => {
      if (data?.id) {
        setReports(prev =>
          prev.map(r => (r.id === data.id ? { ...r, ...data.report, status: data.status } : r))
        );
        if (selected && selected.id === data.id) {
          setSelected(prev => (prev ? { ...prev, ...data.report, status: data.status } : null));
        }
      }
    });

    const unsubDelete = AdminSocket.on('DISASTER_REPORT_DELETED', (data: any) => {
      if (data?.id) {
        setReports(prev => prev.filter(r => r.id !== data.id));
        if (selected && selected.id === data.id) {
          setSelected(null);
        }
      }
    });

    // Background polling interval (every 3.5 seconds) as reliable real-time alternative
    const pollInterval = setInterval(() => {
      checkForNewReports();
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      unsubNew();
      unsubNewUpper();
      unsubUpdate();
      unsubUpdateUpper();
      unsubDelete();
    };
  }, [selected]);

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
      const res = await Api.getDisasterReports(undefined, 50);
      if (res && res.disasterReports) {
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

        // Keep selected report details drawer in sync
        if (selected) {
          const updatedSel = incoming.find(r => r.id === selected.id);
          if (updatedSel) {
            setSelected(prev => (prev ? { ...prev, ...updatedSel } : null));
          }
        }
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

    // Mandatory After Photo Check for RESOLVED status
    const hasAfterPhoto = actionPhotos.length > 0 || !!selected.afterPhoto;
    if (status === 'RESOLVED' && !hasAfterPhoto) {
      alert('⚠️ An after photo is required before this incident can be marked as resolved.\n(Kailangan maglakip ng After Photo bago ma-resolba ang ulat.)');
      return;
    }

    const afterPhoto = actionPhotos.length > 0 ? actionPhotos[actionPhotos.length - 1] : selected.afterPhoto || undefined;

    setStatusLoading(status);
    try {
      const res = await Api.updateReportStatus(
        selected.id,
        status,
        adminNotes,
        affectedRouteInput || undefined,
        actionPhotos.length > 0 ? actionPhotos : undefined,
        afterPhoto
      );
      setReports(prev => prev.map(r => r.id === selected.id ? (res.disasterReport || { ...r, status: status as any, adminNotes, affectedRoute: affectedRouteInput, afterPhoto }) : r));
      setSelected(null);
      setAdminNotes('');
      setAffectedRouteInput('');
      setActionPhotos([]);
      // Immediately refresh list from server
      loadInitialReports();
      alert(`✅ Matagumpay na na-update ang ulat bilang ${status}!`);
    } catch (err: any) {
      alert('⚠️ Hindi ma-update ang ulat: ' + (err?.message || 'Network request failed'));
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

        </div>
      </div>

      <div className="p-3.5 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-amber-300">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
        <div><strong>Disaster Action & Clearing Protocol:</strong> Ang mga ulat na <em>VERIFIED</em> at <em>UNDER CLEARING</em> ay awtomatikong lumalabas sa mobile app at nagpapadala ng push notification sa mga residente.</div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Lahat ng Ulat' },
          { id: 'PENDING', label: '⏳ Bago / Pending' },
          { id: 'VERIFIED', label: '🚨 Verified / Incident' },
          { id: 'UNDER_CLEARING', label: '🚧 Under Clearing' },
          { id: 'RESOLVED', label: '✅ Na-resolba / Resolved' },
          { id: 'REJECTED', label: '❌ Tinanggihan / Rejected' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filter === f.id ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
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
            // Comprehensive photo extraction from all sources (imageUrl, photoUrl, photos, photoItems)
            const photoItemsList: { uri: string; stage: string; label: string; badgeBg: string; uploadedBy?: string }[] = [];
            const allUris: string[] = [];
            const addUri = (u?: string) => {
              if (u && typeof u === 'string' && u.trim() && !allUris.includes(u.trim())) {
                allUris.push(u.trim());
              }
            };

            addUri(r.imageUrl);
            addUri((r as any).photoUrl);
            if (Array.isArray(r.photos)) r.photos.forEach(addUri);
            if (Array.isArray(r.photoItems)) r.photoItems.forEach((pi: any) => addUri(pi?.uri));

            allUris.forEach((uri, idx) => {
              const itemMeta = r.photoItems?.find((pi: any) => pi?.uri === uri);
              let stage = itemMeta?.stage;
              if (!stage) {
                if (r.status === 'PENDING') stage = 'PENDING';
                else if (idx === 0) stage = 'INCIDENT';
                else if (r.status === 'UNDER_CLEARING') stage = 'UNDER_CLEARING';
                else if (r.status === 'RESOLVED') stage = 'RESOLVED';
                else stage = 'INCIDENT';
              } else if (stage === 'PENDING' && r.status !== 'PENDING') {
                stage = 'INCIDENT';
              }

              let badgeLabel = '🚨 INSIDENTE';
              let badgeBg = 'bg-orange-600/90 text-white border-orange-400';
              if (stage === 'PENDING') {
                badgeLabel = '⏳ PENDING';
                badgeBg = 'bg-amber-600/90 text-white border-amber-400';
              } else if (stage === 'UNDER_CLEARING') {
                badgeLabel = '🚧 CLEARING';
                badgeBg = 'bg-sky-600/90 text-white border-sky-400';
              } else if (stage === 'RESOLVED') {
                badgeLabel = '✅ LIGTAS NA';
                badgeBg = 'bg-emerald-600/90 text-white border-emerald-400';
              }

              photoItemsList.push({
                uri,
                stage,
                label: badgeLabel,
                badgeBg,
                uploadedBy: itemMeta?.uploadedBy || r.reporterName || 'MDRRMO'
              });
            });

            const stageRank: Record<string, number> = {
              RESOLVED: 3,
              UNDER_CLEARING: 2,
              INCIDENT: 1,
              PENDING: 0,
            };
            photoItemsList.sort((a, b) => (stageRank[b.stage] || 0) - (stageRank[a.stage] || 0));

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
                          {r.status === 'PENDING' ? '⏳ PENDING VERIFICATION' :
                           r.status === 'VERIFIED' ? '🚨 VERIFIED' :
                           r.status === 'UNDER_CLEARING' ? '🚧 UNDER CLEARING' :
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
                      <Eye className="w-3.5 h-3.5" /> Aksyon / Timeline
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

                {/* Status Lifecycle Timeline */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-bold">
                  {[
                    { key: 'PENDING', label: 'Pending' },
                    { key: 'VERIFIED', label: 'Verified' },
                    { key: 'UNDER_CLEARING', label: 'Clearing' },
                    { key: 'RESOLVED', label: 'Resolved' },
                  ].map((st, sIdx) => {
                    const order = ['PENDING', 'VERIFIED', 'UNDER_CLEARING', 'RESOLVED'];
                    const curIdx = order.indexOf(r.status);
                    const isPassed = curIdx >= sIdx;
                    const isCurrent = curIdx === sIdx;
                    return (
                      <React.Fragment key={st.key}>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                            isCurrent ? 'bg-sky-500 text-white ring-2 ring-sky-400/40' :
                            isPassed ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                            {isPassed && !isCurrent ? '✓' : sIdx + 1}
                          </span>
                          <span className={isCurrent ? 'text-sky-400 font-black' : isPassed ? 'text-emerald-400' : 'text-slate-500'}>
                            {st.label}
                          </span>
                        </div>
                        {sIdx < 3 && <div className={`h-0.5 flex-1 mx-1 ${curIdx > sIdx ? 'bg-emerald-500/80' : 'bg-slate-800'}`} />}
                      </React.Fragment>
                    );
                  })}
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
                      {r.verifiedAt && <span className="text-[10.5px] text-slate-400">({new Date(r.verifiedAt).toLocaleTimeString()})</span>}
                    </div>
                    {r.adminNotes && (
                      <p className="text-xs text-slate-300 pl-3 border-l-2 border-sky-500/40 mt-1">
                        <strong className="text-slate-400">Aksyon / Detalye: </strong>
                        {r.adminNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Before & After Photo Display for RESOLVED */}
                {r.status === 'RESOLVED' && (r.beforePhoto || r.afterPhoto || photoItemsList.length > 1) ? (
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>📸 Before & After Evidence</span>
                      <span className="text-[11px] text-emerald-400 font-bold">✓ Verified Resolution</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* BEFORE */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-wider">
                          🚨 BEFORE (Noong Sakuna)
                        </div>
                        {(r.beforePhoto || r.imageUrl || (photoItemsList[0]?.uri)) ? (
                          <div
                            onClick={() => setPreviewPhotoData({ uri: r.beforePhoto || r.imageUrl || photoItemsList[0].uri, label: 'BEFORE - Noong Sakuna', stage: 'INCIDENT', uploadedBy: r.reporterName })}
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-rose-500/40 hover:border-rose-500 transition"
                          >
                            <img src={r.beforePhoto || r.imageUrl || photoItemsList[0].uri} alt="Before disaster" className="w-full h-24 sm:h-28 object-cover group-hover:scale-105 transition" />
                            <div className="absolute top-1 left-1 bg-rose-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-black border border-rose-400">
                              BEFORE
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 bg-slate-800/40 border border-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-500">
                            Walang Before Photo
                          </div>
                        )}
                      </div>

                      {/* AFTER */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                          ✅ AFTER (Na-resolba)
                        </div>
                        {(r.afterPhoto || (photoItemsList.length > 1 ? photoItemsList[photoItemsList.length - 1]?.uri : null)) ? (
                          <div
                            onClick={() => setPreviewPhotoData({ uri: r.afterPhoto || photoItemsList[photoItemsList.length - 1].uri, label: 'AFTER - Na-resolba', stage: 'RESOLVED', uploadedBy: r.resolvedBy || r.verifiedBy })}
                            className="relative group cursor-pointer rounded-lg overflow-hidden border border-emerald-500/40 hover:border-emerald-500 transition"
                          >
                            <img src={r.afterPhoto || photoItemsList[photoItemsList.length - 1].uri} alt="After clearing" className="w-full h-24 sm:h-28 object-cover group-hover:scale-105 transition" />
                            <div className="absolute top-1 left-1 bg-emerald-600/90 text-white px-1.5 py-0.5 rounded text-[9px] font-black border border-emerald-400">
                              AFTER
                            </div>
                          </div>
                        ) : (
                          <div className="h-24 bg-slate-800/40 border border-slate-700 rounded-lg flex items-center justify-center text-xs text-slate-500">
                            Walang After Photo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : photoItemsList.length > 0 ? (
                  /* Standard Single / Multi Photo Row */
                  <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                    {photoItemsList.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => setPreviewPhotoData({
                          uri: p.uri,
                          stage: p.stage,
                          label: p.label,
                          uploadedBy: p.uploadedBy
                        })}
                        className="relative group cursor-pointer shrink-0 rounded-lg overflow-hidden border border-slate-700 hover:border-sky-500 transition"
                      >
                        <img
                          src={p.uri}
                          alt="Disaster Photo"
                          className="w-28 h-20 object-cover group-hover:scale-105 transition"
                        />
                        <div className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-wide border shadow-md flex items-center gap-1 ${p.badgeBg}`}>
                          {p.label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

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


      {/* UPDATE STATUS & ACTION MODAL */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Pamamahala at Katayuan ng Ulat (Incident Action)">
        {selected && (
          <div className="space-y-4">
            {/* Lifecycle Status Timeline Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Incident Lifecycle Timeline
              </div>
              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                {[
                  { key: 'PENDING', label: '1. Pending Review' },
                  { key: 'VERIFIED', label: '2. Verified' },
                  { key: 'UNDER_CLEARING', label: '3. Under Clearing' },
                  { key: 'RESOLVED', label: '4. Resolved' },
                ].map((step, sIdx) => {
                  const order = ['PENDING', 'VERIFIED', 'UNDER_CLEARING', 'RESOLVED'];
                  const curIdx = order.indexOf(selected.status);
                  const isPassed = curIdx >= sIdx;
                  const isCurrent = curIdx === sIdx;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center min-w-[75px] text-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isCurrent
                              ? 'bg-sky-500 text-white ring-4 ring-sky-500/20 scale-110 shadow-lg'
                              : isPassed
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {isPassed && !isCurrent ? '✓' : sIdx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1 font-semibold ${
                            isCurrent
                              ? 'text-sky-400 font-bold'
                              : isPassed
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {sIdx < 3 && (
                        <div
                          className={`h-0.5 flex-1 min-w-[14px] -mt-4 ${
                            curIdx > sIdx ? 'bg-emerald-500' : 'bg-slate-800'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

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
                    {selected.status === 'PENDING' ? '⏳ PENDING VERIFICATION' :
                     selected.status === 'VERIFIED' ? '🚨 VERIFIED' :
                     selected.status === 'UNDER_CLEARING' ? '🚧 UNDER CLEARING' :
                     selected.status === 'RESOLVED' ? '✅ RESOLVED' :
                     selected.status === 'IMPASSABLE' ? '⛔ IMPASSABLE' :
                     selected.status === 'REJECTED' ? '❌ REJECTED' : selected.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300">{selected.description}</p>
              <p className="text-xs text-slate-400">📍 {selected.locationDescription}</p>
            </div>

            {/* Before Photo Preview */}
            {(selected.beforePhoto || selected.imageUrl || (selected.photos && selected.photos[0])) && (
              <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl space-y-1.5">
                <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span>🚨 Original Before Photo (Noong Isinumite):</span>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={selected.beforePhoto || selected.imageUrl || selected.photos?.[0]}
                    alt="Before condition"
                    className="w-24 h-20 object-cover rounded-lg border border-rose-500/40"
                  />
                  <div className="text-xs text-slate-400 space-y-0.5">
                    <p>📸 Ito ang orihinal na litrato mula sa ulat ng residente.</p>
                    <p className="text-slate-500">Gagamitin sa Before & After comparison kapag na-resolba.</p>
                  </div>
                </div>
              </div>
            )}

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
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>

            {/* Attach Action / After Photo */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-sky-400 block">
                  📸 Maglakip ng After Photo / Clearing Evidence
                </label>
                {selected.status === 'UNDER_CLEARING' && (
                  <span className="text-[10.5px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    * Required bago mag-Resolve
                  </span>
                )}
              </div>

              {selected.status === 'UNDER_CLEARING' && actionPhotos.length === 0 && !selected.afterPhoto && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>An after photo is required before this incident can be marked as resolved.</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl cursor-pointer bg-slate-900/50 hover:bg-slate-900 transition">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-300">Pumili ng After Photo / Litrato ng Aksyon</span>
                  <input type="file" accept="image/*" onChange={handleActionFileUpload} className="hidden" />
                </label>

                {actionPhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap pt-1">
                    {actionPhotos.map((img, i) => (
                      <div key={i} className="relative inline-block">
                        <img src={img} alt="Action Proof" className="w-20 h-16 object-cover rounded-lg border border-sky-500/60" />
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-emerald-400 text-[9px] text-center font-bold">
                          AFTER PHOTO
                        </div>
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

            {/* Stage-Aware Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-400">Mga Aksyon na Nararapat sa Yugtong Ito:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. VERIFY (Enabled ONLY if PENDING) */}
                <button
                  onClick={() => handleUpdateStatus('VERIFIED')}
                  disabled={!!statusLoading || !!deletingReportId || selected.status !== 'PENDING'}
                  className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selected.status === 'PENDING'
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/40 cursor-pointer'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {statusLoading === 'VERIFIED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>✓ I-verify</span>
                </button>

                {/* 2. UNDER CLEARING (Enabled ONLY if VERIFIED) */}
                <button
                  onClick={() => handleUpdateStatus('UNDER_CLEARING')}
                  disabled={!!statusLoading || !!deletingReportId || selected.status !== 'VERIFIED'}
                  className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selected.status === 'VERIFIED'
                      ? 'bg-sky-600 hover:bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-600/30 ring-2 ring-sky-500/40 cursor-pointer'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {statusLoading === 'UNDER_CLEARING' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>🚧 Under Clearing</span>
                </button>

                {/* 3. RESOLVED (Enabled ONLY if UNDER_CLEARING with After Photo) */}
                <button
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  disabled={
                    !!statusLoading ||
                    !!deletingReportId ||
                    selected.status !== 'UNDER_CLEARING' ||
                    (actionPhotos.length === 0 && !selected.afterPhoto)
                  }
                  title={
                    selected.status !== 'UNDER_CLEARING'
                      ? 'Dapat dumaan muna sa Under Clearing bago ma-resolba'
                      : actionPhotos.length === 0 && !selected.afterPhoto
                      ? 'Kailangan muna maglakip ng After Photo bago ma-resolba'
                      : ''
                  }
                  className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selected.status === 'UNDER_CLEARING' && (actionPhotos.length > 0 || !!selected.afterPhoto)
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/40 cursor-pointer'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {statusLoading === 'RESOLVED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>✅ I-resolve</span>
                </button>

                {/* 4. REJECT (Available for PENDING, VERIFIED, or UNDER_CLEARING) */}
                <button
                  onClick={() => handleUpdateStatus('REJECTED')}
                  disabled={!!statusLoading || !!deletingReportId || selected.status === 'RESOLVED' || selected.status === 'REJECTED'}
                  className={`px-3 py-2.5 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    selected.status !== 'RESOLVED' && selected.status !== 'REJECTED'
                      ? 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/40 text-rose-400 cursor-pointer'
                      : 'bg-slate-800/40 border-slate-700/50 text-slate-500 opacity-40 cursor-not-allowed'
                  }`}
                >
                  {statusLoading === 'REJECTED' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>✕ I-reject</span>
                </button>
              </div>
            </div>

            {/* Status History Trail */}
            {Array.isArray(selected.statusHistory) && selected.statusHistory.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-300">📋 Status History & Audit Log:</div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {selected.statusHistory.map((h, hIdx) => (
                    <div key={hIdx} className="text-xs bg-slate-950/50 p-2 rounded border border-slate-800 flex items-center justify-between gap-2">
                      <div className="space-x-1.5">
                        <span className="font-bold text-sky-400">{h.status}</span>
                        <span className="text-slate-400">ni {h.changedBy}</span>
                        {h.remarks && <span className="text-slate-500">({h.remarks})</span>}
                      </div>
                      <span className="text-[10.5px] text-slate-500 shrink-0">
                        {h.changedAt ? new Date(h.changedAt).toLocaleTimeString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

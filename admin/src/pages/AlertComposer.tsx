import React, { useEffect, useState } from 'react';
import { BellRing, Plus, X, Send, ShieldAlert, Trash2, Loader2 } from 'lucide-react';
import { Api } from '../services/api';
import { DisasterAlert } from '../types';
import { ConfirmationModal } from '../components/Common/ConfirmationModal';

const alertLevelStyles: Record<string, string> = {
  INFORMATION: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  ADVISORY: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  WARNING: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  EVACUATION_ORDER: 'bg-red-600/30 text-red-200 border-red-500/60 animate-pulse',
};

const getDefaultExpiresAt = (hoursAhead: number = 24) => {
  const d = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = {
  title: '',
  message: '',
  disasterType: 'FLOOD',
  alertLevel: 'ADVISORY',
  recommendedAction: '',
  expiresAt: getDefaultExpiresAt(24),
  sendPush: true,
  sendSMS: false,
};

export const AlertComposer: React.FC = () => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [testLog, setTestLog] = useState<any>(null);
  const [testingPush, setTestingPush] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [registeringToken, setRegisteringToken] = useState(false);

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try { const res = await Api.getAlerts(); setAlerts(res.alerts); }
    catch { setDemoAlerts(); }
  };

  const setDemoAlerts = () => setAlerts([
    { id: 'a-1', title: 'ADVISORY: Heavy Rainfall & River Monitor [DEMO DATA]', message: 'Trough of LPA expected to bring heavy rainfall over Irosin. Riverbank areas advised to prepare for possible preemptive evacuation.', disasterType: 'FLOOD', alertLevel: 'ADVISORY', affectedBarangayIds: [], affectedBarangayNames: ['All Barangays (Municipal-wide)'], recommendedAction: 'Prepare Go-Bags and monitor MDRRMO bulletins.', issuingAuthority: 'MDRRMO Irosin EOC', startTime: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(), status: 'ACTIVE', isDemo: true },
  ]);

  const handleBroadcast = async () => {
    setIsBroadcasting(true);
    const payload = {
      ...form,
      affectedBarangayIds: [], // Broadcasts to ALL registered residents and barangays in Irosin
      issuingAuthority: 'MDRRMO Irosin Emergency Operations Center',
    };
    try {
      const res = await Api.createAlert(payload);
      setAlerts(prev => [res.alert, ...prev]);
      setLastResult(`Alert broadcast successfully to all residents. Push: ${res.dispatchSummary?.pushCount || 0} device(s) targeted.`);
      setForm({ ...emptyForm, expiresAt: getDefaultExpiresAt(24) });
      setShowForm(false);
      setShowConfirm(false);
    } catch (err: any) {
      setLastResult(`Failed to create alert: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this active emergency alert?')) return;
    setCancellingId(id);
    try {
      await Api.cancelAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' as const } : a));
    } catch {
      alert('Failed to cancel alert.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`PERMANENTLY DELETE this alert?\n\n"${title}"\n\nThis cannot be undone and will remove it from the app immediately.`)) return;
    setDeletingId(id);
    try {
      await Api.deleteAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      setLastResult(`Alert "${title}" permanently deleted.`);
    } catch {
      alert('Failed to delete alert.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRunTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await Api.testPush();
      setTestLog(res);
    } catch (err: any) {
      setTestLog({ error: err.message || 'Error executing test push' });
    } finally {
      setTestingPush(false);
    }
  };

  const handleRegisterManualToken = async () => {
    if (!manualToken.trim()) return;
    setRegisteringToken(true);
    try {
      const res = await Api.registerPushToken(manualToken.trim());
      alert(`Push Token registered successfully! Total tokens stored: ${res.totalTokensStored || 1}`);
      setManualToken('');
      handleRunTestPush();
    } catch (err: any) {
      alert(`Failed to register token: ${err.message}`);
    } finally {
      setRegisteringToken(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 leading-tight">Emergency Alert Composer</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Compose and broadcast official MDRRMO emergency announcements to residents</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleRunTestPush}
            disabled={testingPush}
            className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-bold text-xs sm:text-sm rounded-xl transition disabled:opacity-50"
          >
            <BellRing className="w-4 h-4 text-sky-400" />
            <span>{testingPush ? 'Testing...' : '⚡ Test Push'}</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-red-700 hover:bg-red-600 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-red-700/30 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Alert</span>
          </button>
        </div>
      </div>

      {/* Push Diagnostic Panel */}
      {testLog && (
        <div className="glass-panel p-5 space-y-4 border-sky-500/40 bg-sky-950/20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm">
              <BellRing className="w-5 h-5" /> Push Notification Diagnostic Results
            </div>
            <button onClick={() => setTestLog(null)} className="text-slate-400 hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-300">➕ Add / Register Push Token Manually (Optional Test):</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                placeholder="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleRegisterManualToken}
                disabled={!manualToken || registeringToken}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition disabled:opacity-50"
              >
                {registeringToken ? 'Saving...' : 'Register Token'}
              </button>
            </div>
          </div>

          <div className="text-xs space-y-2 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Tokens found in Store/DB:</span>
              <span className={`font-bold px-2 py-0.5 rounded ${testLog.tokensFoundCount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {testLog.tokensFoundCount || 0}
              </span>
            </div>

            {testLog.tokensInDatabase?.length > 0 && (
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 max-h-32 overflow-y-auto">
                <p className="text-[10px] text-slate-500 font-sans font-bold uppercase mb-1">Registered Device Push Tokens:</p>
                {testLog.tokensInDatabase.map((token: string, i: number) => (
                  <div key={i} className="text-slate-300 text-[11px] truncate font-mono">
                    • {token}
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto text-[11px] text-slate-300">
              <p className="text-[10px] text-slate-500 font-sans font-bold uppercase mb-1">Expo API Diagnostics Output:</p>
              <pre>{JSON.stringify(testLog.diagnostics || testLog, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {lastResult && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${lastResult.startsWith('Failed') ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'} flex items-start justify-between gap-3`}>
          <span>{lastResult}</span>
          <button onClick={() => setLastResult(null)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Alert Compose Form */}
      {showForm && (
        <div className="glass-panel p-6 space-y-5 border-red-500/30">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-lg font-extrabold text-slate-100">Compose Official Emergency Alert</h3>
              <p className="text-xs text-red-400 font-semibold">This alert will be broadcast to registered residents.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Alert Title *</label><input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Typhoon Signal No. 2 — Evacuation Order for Monbon" className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500 transition" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Alert Message *</label><textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Provide detailed emergency information for residents..." className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500 resize-none" /></div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Alert Level *</label>
              <select value={form.alertLevel} onChange={e => setForm(p => ({ ...p, alertLevel: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500">
                {['INFORMATION', 'ADVISORY', 'WARNING', 'EVACUATION_ORDER'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Disaster Type</label>
              <select value={form.disasterType} onChange={e => setForm(p => ({ ...p, disasterType: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500">
                {['TYPHOON', 'FLOOD', 'EARTHQUAKE', 'VOLCANIC_ERUPTION', 'LANDSLIDE', 'GENERAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Recommended Action *</label><input type="text" value={form.recommendedAction} onChange={e => setForm(p => ({ ...p, recommendedAction: e.target.value }))} placeholder="e.g., EVACUATE IMMEDIATELY to nearest designated center." className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500" /></div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Expires At *</label>
                <div className="flex items-center gap-1">
                  {[
                    { label: '+6h', hours: 6 },
                    { label: '+12h', hours: 12 },
                    { label: '+24h', hours: 24 },
                    { label: '+3d', hours: 72 },
                    { label: '+7d', hours: 168 },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, expiresAt: getDefaultExpiresAt(p.hours) }))}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition"
                      title={`Set alert expiration to +${p.hours} hours`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
            <div className="md:col-span-2 p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0" />
              <p className="text-xs text-sky-300">
                <strong className="text-white">Municipal-Wide Broadcast:</strong> This alert will be dispatched to <strong className="text-white">all 28 barangays and all registered mobile users</strong> across Irosin.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.sendPush} onChange={e => setForm(p => ({ ...p, sendPush: e.target.checked }))} /> Send Push Notification</label>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input type="checkbox" checked={form.sendSMS} onChange={e => setForm(p => ({ ...p, sendSMS: e.target.checked }))} /> Send SMS Alert (requires Semaphore key)</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition">Cancel</button>
            <button type="button" onClick={() => setShowConfirm(true)} disabled={isBroadcasting || !form.title || !form.message || !form.recommendedAction} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold transition shadow-lg shadow-red-700/30 disabled:opacity-50 disabled:cursor-not-allowed">
              {isBroadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Broadcast Alert</span>
            </button>
          </div>
        </div>
      )}

      {/* Existing Alerts List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-300 border-b border-slate-800 pb-2">All Emergency Alerts</h3>
        {alerts.map(a => (
          <div key={a.id} className={`glass-panel p-5 space-y-3 ${a.alertLevel === 'EVACUATION_ORDER' ? 'border-red-500/50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${alertLevelStyles[a.alertLevel]}`}>{a.alertLevel.replace('_', ' ')}</span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{a.disasterType}</span>                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.status === 'ACTIVE' ? 'text-emerald-400 bg-emerald-500/10' : a.status === 'CANCELLED' ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 bg-slate-800'}`}>{a.status}</span>
                </div>
                <h4 className="font-extrabold text-slate-100">{a.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{a.message}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCancel(a.id)}
                    disabled={cancellingId === a.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-900/40 text-amber-400 border border-amber-500/30 hover:bg-amber-900/60 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {cancellingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Cancel</span>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(a.id, a.title)}
                  disabled={deletingId === a.id}
                  className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white transition flex items-center gap-1 disabled:opacity-50"
                  title="Permanently delete this alert"
                >
                  {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Delete</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800 pt-2">
              <span>Authority: {a.issuingAuthority}</span>
              <span>•</span>
              <span>Started: {new Date(a.startTime).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleBroadcast}
        message={`You are about to broadcast an official "${form.alertLevel}" emergency alert: "${form.title}" to all registered residents across Irosin.`}
        confirmText={form.alertLevel === 'EVACUATION_ORDER' ? 'CONFIRM EVACUATION ORDER' : 'Yes, Broadcast Alert'}
      />
    </div>
  );
};

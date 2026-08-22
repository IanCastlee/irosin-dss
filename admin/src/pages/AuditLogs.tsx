import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { Api } from '../services/api';
import { AuditLog } from '../types';

const actionColors: Record<string, string> = {
  USER_LOGIN: 'text-sky-400',
  USER_REGISTERED: 'text-emerald-400',
  CREATE_ALERT: 'text-red-400',
  CANCEL_ALERT: 'text-slate-400',
  CREATE_EVACUATION_CENTER: 'text-emerald-400',
  UPDATE_EVACUATION_CENTER: 'text-amber-400',
  DELETE_EVACUATION_CENTER: 'text-rose-400',
  CREATE_HAZARD_ZONE: 'text-amber-400',
  UPDATE_HAZARD_ZONE: 'text-amber-400',
  CREATE_BARANGAY: 'text-sky-400',
  VERIFY_REPORT: 'text-emerald-400',
  SUBMIT_REPORT: 'text-purple-400',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await Api.getAuditLogs();
      setLogs(res.auditLogs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Audit Logs</h2>
          <p className="text-sm text-slate-400 mt-1">Complete record of all administrative actions performed in the system</p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition border border-slate-700 text-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>I-refresh</span>
        </button>
      </div>

      <div className="glass-panel p-4 space-y-2">
        {logs.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No audit logs yet.</p>
        ) : (
          logs.map(log => (
            <div key={log.id} className="flex items-start gap-4 py-3 border-b border-slate-800/50 hover:bg-slate-900/40 rounded px-2">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0 mt-0.5"><ShieldCheck className="w-4 h-4 text-sky-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-extrabold uppercase ${actionColors[log.action] || 'text-slate-300'}`}>{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-[10px] text-slate-500">by</span>
                  <span className="text-xs font-semibold text-slate-300">{log.performedBy}</span>
                  <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">{log.performedByRole}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{log.details}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Collection: {log.targetCollection}/{log.targetId}</p>
              </div>
              <div className="shrink-0 text-[10px] text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{new Date(log.timestamp).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

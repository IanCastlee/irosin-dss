import React, { useEffect, useState } from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
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

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try { const res = await Api.getAuditLogs(); setLogs(res.auditLogs); }
    catch { setDemoLogs(); }
  };

  const setDemoLogs = () => setLogs([
    { id: 'l-1', action: 'SYSTEM_INITIALIZED', performedBy: 'SYSTEM', performedByRole: 'MDRRMO_ADMIN', targetCollection: 'system', targetId: 'init', details: 'System initialized with Irosin Sorsogon DEMO DATA.', timestamp: new Date().toISOString() },
    { id: 'l-2', action: 'CREATE_ALERT', performedBy: 'MDRRMO Admin Officer', performedByRole: 'MDRRMO_ADMIN', targetCollection: 'alerts', targetId: 'alert-1', details: 'Created ADVISORY: Heavy Rainfall & River Monitor', timestamp: new Date().toISOString() },
    { id: 'l-3', action: 'VERIFY_REPORT', performedBy: 'MDRRMO Admin Officer', performedByRole: 'MDRRMO_ADMIN', targetCollection: 'disaster_reports', targetId: 'report-1', details: 'Status updated to VERIFIED', timestamp: new Date().toISOString() },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Audit Logs</h2>
        <p className="text-sm text-slate-400 mt-1">Complete record of all administrative actions performed in the system</p>
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

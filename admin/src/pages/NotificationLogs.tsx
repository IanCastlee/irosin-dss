import React, { useEffect, useState } from 'react';
import { Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Api } from '../services/api';
import { NotificationLog } from '../types';

export const NotificationLogs: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  useEffect(() => { loadLogs(); }, []);

  const loadLogs = async () => {
    try { const res = await Api.getNotificationLogs(); setLogs(res.notificationLogs); }
    catch { setDemoLogs(); }
  };

  const setDemoLogs = () => setLogs([
    { id: 'log-1', channel: 'PUSH', recipientPhoneOrToken: 'topic:all_residents', message: '[ADVISORY] Heavy Rainfall & River Monitor', providerResponse: '[DEMO PUSH LOGGED] SIMULATED PUSH', deliveryStatus: 'MOCK_SENT', timestamp: new Date().toISOString() },
    { id: 'log-2', channel: 'SMS', recipientPhoneOrToken: '+639171234567', message: 'MDRRMO IROSIN [ADVISORY]: Heavy Rainfall...', providerResponse: '[DEMO SMS LOGGED] SIMULATED DISPATCH', deliveryStatus: 'MOCK_SENT', timestamp: new Date().toISOString() },
  ]);

  const statusIcon = (status: string) => {
    if (status === 'SENT') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'MOCK_SENT') return <CheckCircle className="w-4 h-4 text-sky-400" />;
    return <XCircle className="w-4 h-4 text-rose-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100">Notification Logs</h2>
        <p className="text-sm text-slate-400 mt-1">Record of all push notification and SMS dispatches (including mock/demo dispatches)</p>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="text-xs font-bold text-slate-400 grid grid-cols-12 gap-2 pb-2 border-b border-slate-800 uppercase tracking-wider">
          <span className="col-span-1">Type</span>
          <span className="col-span-3">Recipient</span>
          <span className="col-span-4">Message</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Time</span>
        </div>
        {logs.length === 0 && <p className="text-center text-slate-400 py-8">No notification logs yet.</p>}
        {logs.map(log => (
          <div key={log.id} className="grid grid-cols-12 gap-2 text-xs items-start py-2 border-b border-slate-800/50 hover:bg-slate-900/50 rounded">
            <div className="col-span-1">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.channel === 'SMS' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>{log.channel}</span>
            </div>
            <div className="col-span-3 text-slate-400 font-mono break-all">{log.recipientPhoneOrToken}</div>
            <div className="col-span-4 text-slate-300">{log.message}</div>
            <div className="col-span-2 flex items-center gap-1.5">
              {statusIcon(log.deliveryStatus)}
              <span className={log.deliveryStatus === 'SENT' ? 'text-emerald-400' : log.deliveryStatus === 'MOCK_SENT' ? 'text-sky-400' : 'text-rose-400'}>{log.deliveryStatus}</span>
            </div>
            <div className="col-span-2 text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Zap, Plus, Clock, Calendar, CheckCircle2, AlertTriangle, Send, Bell, MapPin, Loader2 } from 'lucide-react';
import { Api } from '../services/api';
import { Modal } from '../components/Common/Modal';

interface PowerAdvisory {
  id: string;
  title: string;
  affectedBarangays: string[];
  startTime: string;
  endTime: string;
  reason: string;
  status: 'SCHEDULED' | 'ONGOING' | 'RESTORED';
  issuedBy?: string;
  createdAt: string;
}

const ALL_BARANGAYS = [
  'Monbon', 'San Agustin', 'Gabao', 'San Julian', 'Buenavista',
  'San Roque', 'Patag', 'Cogon', 'Macawayan', 'Poblacion',
  'Bacolod', 'Batang', 'Bolos', 'Carriedo', 'Casiguran Road Feeders'
];

export const PowerInterruptionPage: React.FC = () => {
  const [advisories, setAdvisories] = useState<PowerAdvisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('SORECO II Advance Power Interruption Advisory');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>(['Monbon', 'San Agustin', 'Gabao']);
  const [reason, setReason] = useState('Scheduled preventive maintenance, replacement of rotten cross-arms, and line clearing along Feeder 3.');
  const [status, setStatus] = useState<'SCHEDULED' | 'ONGOING' | 'RESTORED'>('SCHEDULED');

  useEffect(() => {
    loadAdvisories();
  }, []);

  const loadAdvisories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/power-interruptions');
      if (res.ok) {
        const data = await res.json();
        setAdvisories(data.powerInterruptions || []);
      }
    } catch (err) {
      console.warn('Error loading power advisories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBrgy = (brgy: string) => {
    setSelectedBarangays(prev =>
      prev.includes(brgy) ? prev.filter(b => b !== brgy) : [...prev, brgy]
    );
  };

  const handleSelectAllBrgys = () => {
    if (selectedBarangays.length === ALL_BARANGAYS.length) {
      setSelectedBarangays([]);
    } else {
      setSelectedBarangays([...ALL_BARANGAYS]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert('Mangyaring pumili ng Petsa ng Brownout');
      return;
    }

    try {
      setSubmitting(true);
      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${startDate}T${endTime}:00`).toISOString();

      const token = localStorage.getItem('irosin_admin_token') || sessionStorage.getItem('irosin_admin_token');

      const res = await fetch('/api/v1/power-interruptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          startTime: startDateTime,
          endTime: endDateTime,
          affectedBarangays: selectedBarangays,
          reason,
          status,
          issuedBy: 'SORECO II / MDRRMO Operations Center'
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        await loadAdvisories();
        alert('✅ Matagumpay na naipaskil at naipamahagi sa mga residente gamit ang Push Notification!');
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to create advisory'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'SCHEDULED' | 'ONGOING' | 'RESTORED') => {
    try {
      const token = localStorage.getItem('irosin_admin_token') || sessionStorage.getItem('irosin_admin_token');
      const res = await fetch(`/api/v1/power-interruptions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await loadAdvisories();
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-400" /> Power Interruption Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Publish advance brownout advisories and broadcast automated Push Notifications to all residents
          </p>
        </div>

        <button
          onClick={() => {
            const tmrw = new Date();
            tmrw.setDate(tmrw.getDate() + 2);
            setStartDate(tmrw.toISOString().split('T')[0]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4" /> Mag-post ng Advance Notice
        </button>
      </div>

      {/* Advisory Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Kinukuha ang talaan ng power advisories...</div>
        ) : advisories.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-200">Walang Aktibong Power Interruption Advisory</h3>
            <p className="text-sm text-slate-400 mt-1">Pindutin ang buton sa itaas upang mag-post ng advance notice.</p>
          </div>
        ) : (
          advisories.map(item => {
            const isRestored = item.status === 'RESTORED';
            const isOngoing = item.status === 'ONGOING';

            return (
              <div
                key={item.id}
                className={`p-5 bg-slate-900 border rounded-2xl space-y-4 ${
                  isOngoing
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : isRestored
                    ? 'border-slate-800 opacity-80'
                    : 'border-amber-500/40 bg-amber-950/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                        isOngoing
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : isRestored
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {item.status === 'SCHEDULED' ? '🕒 NAKA-ISKEDYUL (ADVANCE)' : (isOngoing ? '⚡ ONGOING BROWNOUT' : '💡 MAY KURYENTE NA')}
                    </span>
                    <span className="text-xs text-slate-400">Pinaskil: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="flex items-center gap-2">
                    {item.status === 'SCHEDULED' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'ONGOING')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        I-set as Ongoing
                      </button>
                    )}
                    {item.status !== 'RESTORED' && (
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'RESTORED')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Restored
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-100">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <strong>Petsa:</strong> {new Date(item.startTime).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <strong>Oras:</strong> {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Mga Apektadong Barangay at Sitios:
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.affectedBarangays.join(' • ')}</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400">Dahilan ng Interruption:</p>
                  <p className="text-sm text-slate-200 mt-0.5">{item.reason}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Mag-post ng Advance Power Interruption Advisory">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Pamagat ng Abiso</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Petsa</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Simula (Start)</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Wakas (End)</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Apektadong mga Barangay</label>
              <button
                type="button"
                onClick={handleSelectAllBrgys}
                className="text-xs text-amber-400 hover:underline font-bold"
              >
                {selectedBarangays.length === ALL_BARANGAYS.length ? 'I-unselect Lahat' : 'Piliin Lahat'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
              {ALL_BARANGAYS.map(brgy => (
                <label key={brgy} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={selectedBarangays.includes(brgy)}
                    onChange={() => handleToggleBrgy(brgy)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-0"
                  />
                  <span>{brgy}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Dahilan / Scope ng Trabaho</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
              required
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300">
            <Bell className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Awtomatikong magpapadala ng <strong>Push Notification</strong> sa lahat ng registered residents sa sandaling mai-post ito.</span>
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
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
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

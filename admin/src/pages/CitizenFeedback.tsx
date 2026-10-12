import React, { useState, useEffect } from 'react';
import {
  MessageSquareQuote,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  AlertCircle,
  Phone,
  MapPin,
  RefreshCw,
  Sparkles,
  MessageCircle,
  HelpCircle,
  ThumbsUp,
  Filter,
} from 'lucide-react';
import { Api } from '../services/api';
import { AdminSocket } from '../services/socketService';

interface FeedbackItem {
  id: string;
  name: string;
  message: string;
  contactNumber?: string;
  barangayName?: string;
  category: 'SUGGESTION' | 'COMPLAINT' | 'INQUIRY' | 'COMMENDATION' | 'OTHER';
  status: 'NEW' | 'REVIEWED' | 'RESOLVED';
  adminNotes?: string;
  createdAt: string;
}

export const CitizenFeedback: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'REVIEWED' | 'RESOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await Api.getFeedbacks();
      if (res && res.feedbacks) {
        setFeedbacks(res.feedbacks);
      }
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    // Listen for incoming feedbacks in real-time
    const unsubNew = AdminSocket.on('new_citizen_feedback', (newFb: FeedbackItem) => {
      setFeedbacks(prev => [newFb, ...prev.filter(f => f.id !== newFb.id)]);
    });

    const unsubStatus = AdminSocket.on('citizen_feedback_status_updated', (data: { id: string; status: string }) => {
      setFeedbacks(prev =>
        prev.map(f => (f.id === data.id ? { ...f, status: data.status as any } : f))
      );
    });

    const unsubDelete = AdminSocket.on('citizen_feedback_deleted', (data: { id: string }) => {
      setFeedbacks(prev => prev.filter(f => f.id !== data.id));
    });

    return () => {
      unsubNew();
      unsubStatus();
      unsubDelete();
    };
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'REVIEWED' | 'RESOLVED') => {
    setActionLoadingId(id);
    try {
      await Api.updateFeedbackStatus(id, newStatus);
      setFeedbacks(prev =>
        prev.map(f => (f.id === id ? { ...f, status: newStatus } : f))
      );
    } catch (err: any) {
      alert('Hindi na-update ang status: ' + (err?.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Sigurado ka bang nais mong burahin ang feedback na ito?')) return;
    setActionLoadingId(id);
    try {
      await Api.deleteFeedback(id);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
    } catch (err: any) {
      alert('Hindi nabura ang feedback: ' + (err?.message || 'Error'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = feedbacks.filter(f => {
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || f.category === categoryFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      f.name.toLowerCase().includes(q) ||
      f.message.toLowerCase().includes(q) ||
      (f.barangayName && f.barangayName.toLowerCase().includes(q)) ||
      (f.contactNumber && f.contactNumber.includes(q));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'SUGGESTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" /> Suhestiyon
          </span>
        );
      case 'COMPLAINT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> Puna / Reklamo
          </span>
        );
      case 'INQUIRY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <HelpCircle className="w-3.5 h-3.5" /> Katanungan
          </span>
        );
      case 'COMMENDATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ThumbsUp className="w-3.5 h-3.5" /> Pagpupugay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            <MessageCircle className="w-3.5 h-3.5" /> Iba Pa
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black bg-rose-600 text-white shadow-sm shadow-rose-600/30 animate-pulse">
            Bago (New)
          </span>
        );
      case 'REVIEWED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-sky-600/20 text-sky-300 border border-sky-500/40">
            <Clock className="w-3 h-3" /> Na-review
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="w-3 h-3" /> Naaksyunan
          </span>
        );
      default:
        return null;
    }
  };

  const newCount = feedbacks.filter(f => f.status === 'NEW').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <MessageSquareQuote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
                Mga Puna at Suhestiyon ng Residente
                {newCount > 0 && (
                  <span className="text-xs bg-rose-600 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow-lg shadow-rose-600/40">
                    {newCount} Bago
                  </span>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Talaan ng mga opinyon, komento, at suhestiyon na ipinadala ng mga mamamayan mula sa mobile app.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchFeedbacks}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>I-refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Maghanap ayon sa pangalan, mensahe, barangay, o contact number..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Lahat ng Kategorya</option>
              <option value="SUGGESTION">💡 Suhestiyon</option>
              <option value="COMPLAINT">💬 Puna / Reklamo</option>
              <option value="INQUIRY">❓ Katanungan</option>
              <option value="COMMENDATION">⭐ Pagpupugay</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: 'Lahat ng Puna', count: feedbacks.length },
            { id: 'NEW', label: 'Bago / Hindi pa Nababasa', count: feedbacks.filter(f => f.status === 'NEW').length },
            { id: 'REVIEWED', label: 'Na-review', count: feedbacks.filter(f => f.status === 'REVIEWED').length },
            { id: 'RESOLVED', label: 'Naaksyunan', count: feedbacks.filter(f => f.status === 'RESOLVED').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  statusFilter === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
          <p className="font-semibold text-sm">Kinukuha ang mga puna at suhestiyon...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6">
          <MessageSquareQuote className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-bold text-slate-300">Walang Nakitang Feedback</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'Walang tumutugma sa iyong filter o search query.'
              : 'Wala pang naipapadalang puna o suhestiyon ang mga residente sa kasalukuyan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition hover:border-slate-700 ${
                item.status === 'NEW'
                  ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'border-slate-800/80'
              }`}
            >
              <div>
                {/* Card Top: Badges and Date */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {getCategoryBadge(item.category)}
                    {getStatusBadge(item.status)}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('fil-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Citizen Info */}
                <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mb-3 text-xs">
                  <span className="font-black text-slate-100 text-sm">{item.name}</span>
                  {item.barangayName && (
                    <span className="flex items-center gap-1 text-slate-400 font-semibold bg-slate-800/60 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-sky-400" /> {item.barangayName}
                    </span>
                  )}
                  {item.contactNumber ? (
                    <a
                      href={`tel:${item.contactNumber}`}
                      className="flex items-center gap-1 text-amber-400 hover:underline font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md"
                    >
                      <Phone className="w-3 h-3" /> {item.contactNumber}
                    </a>
                  ) : null}
                </div>

                {/* Message Body */}
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 mb-4 text-xs sm:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                  "{item.message}"
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.status !== 'REVIEWED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'REVIEWED')}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
                    >
                      I-marka bilang Na-review
                    </button>
                  )}

                  {item.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                      disabled={actionLoadingId === item.id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-sm shadow-emerald-600/30"
                    >
                      Naaksyunan ✓
                    </button>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={actionLoadingId === item.id}
                  title="Burahin ang feedback"
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

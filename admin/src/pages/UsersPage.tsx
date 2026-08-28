import React, { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Phone,
  UserCheck,
  UserX,
  Trash2,
  ShieldAlert,
  Ban,
  Activity,
  Plus,
  Flame,
  GlobeLock,
  Search,
  Check,
  Sparkles,
  MoreVertical,
} from 'lucide-react';
import { User, SecurityThreat, BlockedIpRecord } from '../types';
import { Api } from '../services/api';

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  MDRRMO_ADMIN: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  BARANGAY_OFFICIAL: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  RESPONDER: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  RESIDENT: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

const threatTypeBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DDOS_BURST: { label: 'DDoS Burst Attack', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  BRUTE_FORCE: { label: 'Brute-Force Password', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  SPAM_REGISTRATION: { label: 'Registration Spam', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  INJECTION_ATTEMPT: { label: 'Malicious Injection', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
};

export const UsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'responders' | 'all' | 'security'>('responders');
  const [users, setUsers] = useState<User[]>([]);
  const [threats, setThreats] = useState<SecurityThreat[]>([]);
  const [blockedIps, setBlockedIps] = useState<BlockedIpRecord[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED'>('ALL');

  // Manual Block IP Modal State
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualReason, setManualReason] = useState('Malicious traffic and rate limit violations');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, threatsRes, blockedRes] = await Promise.allSettled([
        Api.getUsers(),
        Api.getSecurityThreats(),
        Api.getBlockedIps()
      ]);

      if (usersRes.status === 'fulfilled') setUsers(usersRes.value?.users || []);
      if (threatsRes.status === 'fulfilled') setThreats(threatsRes.value?.threats || []);
      if (blockedRes.status === 'fulfilled') setBlockedIps(blockedRes.value?.blockedIps || []);
    } catch (err: any) {
      console.error('Failed to load users & security data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleUpdateStatus = async (id: string, status: 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'INACTIVE') => {
    setActionLoadingId(id);
    try {
      await Api.updateUserStatus(id, status);
      await loadData();
    } catch (err: any) {
      alert(`Error updating user status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleJurisdiction = async (id: string, isMunicipalWide: boolean, name: string) => {
    setActionLoadingId(id);
    try {
      await Api.updateUserJurisdiction(id, isMunicipalWide);
      alert(
        isMunicipalWide
          ? `🌍 Naka-set na si "${name}" bilang Municipal-Wide Responder!\n\nMakakatanggap na siya ng lahat ng mga ulat ng sakuna at push notification mula sa LAHAT ng 52 barangay sa buong bayan.`
          : `🏢 Naka-set na si "${name}" para sa kanyang takdang Barangay lamang.`
      );
      await loadData();
    } catch (err: any) {
      alert(`Error updating responder jurisdiction: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Sigurado ka bang nais mong burahin ang account ni "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      await Api.deleteUser(id);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockIp = async (ip: string, reason?: string) => {
    if (!ip) return;
    if (!window.confirm(`Sigurado ka bang nais mong i-BLOCK ang IP address na ${ip}? Hindi na ito makakapagpadala ng anumang request sa server.`)) return;

    setActionLoadingId(ip);
    try {
      await Api.blockIp(ip, reason || 'Suspicious attack activity');
      alert(`✅ Na-block na ang IP address: ${ip}`);
      setShowBlockModal(false);
      setManualIp('');
      await loadData();
    } catch (err: any) {
      alert(`Error blocking IP: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    if (!window.confirm(`Nais mo bang tanggalin sa Blocklist ang IP address na ${ip}?`)) return;
    setActionLoadingId(ip);
    try {
      await Api.unblockIp(ip);
      alert(`✅ Na-unblock na ang IP address: ${ip}`);
      await loadData();
    } catch (err: any) {
      alert(`Error unblocking IP: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const responders = users.filter(u => u.role === 'RESPONDER' || u.role === 'BARANGAY_OFFICIAL');
  const pendingResponders = responders.filter(u => u.status === 'PENDING_APPROVAL');
  const activeResponders = responders.filter(u => u.status === 'ACTIVE');
  const activeThreats = threats.filter(t => !t.isBlocked);

  // Filtered lists
  const filteredResponders = responders.filter(r => {
    const matchSearch =
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.username && r.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.barangayName && r.barangayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.roleTitle && r.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredAllUsers = users.filter(u => {
    return (
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.barangayName && u.barangayName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* 🚀 Top Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">
              User Access & Security Firewall
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE SHIELD
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Pamahalaan ang mga rehistradong responders, aprubahan ang kanilang account para sa Action Portal, at subaybayan ang real-time DDoS & IP Firewall defenses.
          </p>
        </div>

        {/* Action Tabs Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 self-start shrink-0">
          <button
            onClick={() => setActiveTab('responders')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'responders'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Responders Portal</span>
            {pendingResponders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-black animate-pulse">
                {pendingResponders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 border border-sky-400/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lahat ng Users</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-bold border border-slate-700">
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-lg shadow-rose-600/30 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Security & Firewall</span>
            {activeThreats.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-black animate-bounce">
                {activeThreats.length}
              </span>
            )}
            {blockedIps.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-rose-300 font-bold border border-rose-500/30">
                {blockedIps.length} Blocked
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 📊 High-Impact Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Approvals */}
        <div className="relative overflow-hidden bg-slate-900/70 p-4 rounded-2xl border border-amber-500/30 backdrop-blur-md shadow-lg group hover:border-amber-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Naghihintay ng Pag-apruba
            </span>
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 tracking-tight">
            {pendingResponders.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Nangangailangan ng Admin validation
          </p>
        </div>

        {/* Card 2: Active Responders */}
        <div className="relative overflow-hidden bg-slate-900/70 p-4 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-lg group hover:border-emerald-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Aktibong Responders
            </span>
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 tracking-tight">
            {activeResponders.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            May access sa live incident reports
          </p>
        </div>

        {/* Card 3: Security Threats & Firewall */}
        <div className="relative overflow-hidden bg-slate-900/70 p-4 rounded-2xl border border-rose-500/30 backdrop-blur-md shadow-lg group hover:border-rose-500/50 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Firewall Defense
            </span>
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-100 tracking-tight">
            {threats.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Ban className="w-3 h-3 text-rose-400" />
            {blockedIps.length} IPs banned sa firewall
          </p>
        </div>

        {/* Card 4: Database Storage */}
        <div className="relative overflow-hidden bg-slate-900/70 p-4 rounded-2xl border border-sky-500/30 backdrop-blur-md shadow-lg group hover:border-sky-500/50 transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Database Storage
            </span>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="I-refresh ang Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div>
            <p className="text-xl font-bold text-slate-100 mt-2">Firestore Active</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Google Cloud Synchronized</p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: RESPONDERS PORTAL
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'responders' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
            {/* Search Box */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Maghanap ayon sa pangalan, username, barangay..."
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto">
              {(['ALL', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {status === 'ALL'
                    ? `Lahat (${responders.length})`
                    : status === 'PENDING_APPROVAL'
                    ? `Pending (${pendingResponders.length})`
                    : status === 'ACTIVE'
                    ? `Active (${activeResponders.length})`
                    : 'Rejected'}
                </button>
              ))}
            </div>
          </div>

          {/* Responders Table */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40 rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-sky-500/10 rounded-lg border border-sky-500/20 text-sky-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-100">
                  Mga Rehistradong Responders & BDRRMC Officers
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {filteredResponders.length} Naitala
              </span>
            </div>

            {filteredResponders.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-500">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-200">Walang natagpuang responder</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Kapag nag-register ang responder o tanod sa mobile app gamit ang username, lilitaw ito rito para sa agarang pagsusuri ng Admin.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto min-h-[320px] pb-36 custom-scrollbar">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[11px] bg-slate-950/20">
                      <th className="p-4">Responder & Username</th>
                      <th className="p-4">Tungkulin / Posisyon</th>
                      <th className="p-4">Barangay Assignment</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Petsa</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Aksyon ng Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredResponders.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 shrink-0 text-sm">
                              {r.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-100 text-xs">{r.fullName}</p>
                              <p className="text-[11px] text-sky-400 font-mono font-semibold flex items-center gap-1 mt-0.5">
                                <span>@{r.username || r.email?.split('@')[0] || 'user'}</span>
                                {r.email && <span className="text-slate-500 font-sans">• {r.email}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold">
                            {r.roleTitle || 'Barangay Responder'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>Brgy. {r.barangayName || 'Irosin'}</span>
                            </div>
                            {r.isMunicipalWide ? (
                              <span className="w-fit px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1 shadow-sm shadow-purple-500/10">
                                <GlobeLock className="w-3 h-3 text-purple-400" /> Lahat ng Barangay
                              </span>
                            ) : (
                              <span className="w-fit px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-semibold">
                                Barangay Lamang
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{r.phone || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">
                          {r.status === 'ACTIVE' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 w-fit shadow-sm shadow-emerald-500/10">
                              <CheckCircle2 className="w-3 h-3" /> ACTIVE / APPROVED
                            </span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1 w-fit">
                              <XCircle className="w-3 h-3" /> REJECTED
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 w-fit animate-pulse">
                              <Clock className="w-3 h-3" /> PENDING APPROVAL
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="relative inline-block text-left action-menu-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === r.id ? null : r.id);
                              }}
                              disabled={actionLoadingId === r.id}
                              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                                openDropdownId === r.id
                                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-md shadow-sky-500/10'
                                  : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
                              }`}
                              title="Pindutin para sa mga Aksyon ng Admin"
                            >
                              {actionLoadingId === r.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </button>

                            {/* Floating Dropdown Actions Menu */}
                            {openDropdownId === r.id && (
                              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl z-[9999] py-1.5 divide-y divide-slate-800 text-left">
                                {/* Section 1: Coverage / Jurisdiction */}
                                <div className="p-1.5">
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleToggleJurisdiction(r.id, !r.isMunicipalWide, r.fullName);
                                    }}
                                    disabled={actionLoadingId === r.id}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition hover:bg-slate-800 text-slate-200"
                                  >
                                    <GlobeLock className="w-4 h-4 text-purple-400 shrink-0" />
                                    <div>
                                      <p className="text-slate-100 font-bold">
                                        {r.isMunicipalWide ? 'I-set: Barangay Lamang' : 'I-set: Lahat ng Barangay'}
                                      </p>
                                      <p className="text-[10px] text-slate-400 font-normal">
                                        {r.isMunicipalWide
                                          ? `Limitahan sa Brgy. ${r.barangayName || 'Irosin'}`
                                          : 'Makatanggap ng ulat sa buong bayan'}
                                      </p>
                                    </div>
                                  </button>
                                </div>

                                {/* Section 2: Account Approval Status */}
                                <div className="p-1.5">
                                  {r.status !== 'ACTIVE' && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleUpdateStatus(r.id, 'ACTIVE');
                                      }}
                                      disabled={actionLoadingId === r.id}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition hover:bg-emerald-500/10 text-emerald-400"
                                    >
                                      <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <span>Aprubahan ang Account</span>
                                    </button>
                                  )}

                                  {r.status !== 'REJECTED' && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdownId(null);
                                        handleUpdateStatus(r.id, 'REJECTED');
                                      }}
                                      disabled={actionLoadingId === r.id}
                                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition hover:bg-amber-500/10 text-amber-400"
                                    >
                                      <UserX className="w-4 h-4 text-amber-400 shrink-0" />
                                      <span>{r.status === 'ACTIVE' ? 'I-deactivate ang Account' : 'Tanggihan ang Aplikasyon'}</span>
                                    </button>
                                  )}
                                </div>

                                {/* Section 3: Delete Account */}
                                <div className="p-1.5">
                                  <button
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleDeleteUser(r.id, r.fullName);
                                    }}
                                    disabled={actionLoadingId === r.id}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-left transition hover:bg-rose-500/15 text-rose-400"
                                  >
                                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span>Burahin ang Account</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ALL SYSTEM USERS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-black text-slate-100">
                  Lahat ng Nakarehistrong User sa System ({users.length})
                </h3>
              </div>
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] bg-slate-950/20">
                    <th className="p-4">Pangalan</th>
                    <th className="p-4">Username / Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Barangay</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aksyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAllUsers.map(u => {
                    const rStyle = roleColors[u.role] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-4">
                          <p className="font-bold text-slate-200">{u.fullName}</p>
                          {u.roleTitle && <p className="text-[10px] text-slate-500">{u.roleTitle}</p>}
                        </td>
                        <td className="p-4 font-mono text-slate-300">
                          {u.username ? <span className="text-sky-400 font-bold">@{u.username}</span> : u.email || 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${rStyle.bg} ${rStyle.text} ${rStyle.border}`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {u.isMunicipalWide ? (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
                              🌍 Municipal-Wide
                            </span>
                          ) : (
                            <span>{u.barangayName || 'Irosin'}</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">{u.phone || 'N/A'}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.status === 'ACTIVE' ? 'text-emerald-400' : u.status === 'PENDING_APPROVAL' ? 'text-amber-400' : 'text-rose-400'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            disabled={actionLoadingId === u.id}
                            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                            title="Burahin ang account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: 🛡️ SECURITY THREATS & FIREWALL
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Quick Action Header for Firewall */}
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-rose-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/30 text-rose-400">
                <GlobeLock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-100">Live Firewall Protection Matrix</h4>
                <p className="text-xs text-slate-400">Awtomatikong sinasala ang mga DDoS flood attacks, brute-force password attempts, at spam accounts.</p>
              </div>
            </div>
            <button
              onClick={() => setShowBlockModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Mag-block ng IP</span>
            </button>
          </div>

          {/* Live Detected Threats Table */}
          <div className="bg-slate-900/60 rounded-3xl border border-rose-500/20 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-rose-500/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-black text-slate-100">
                  Mga Kahina-hinalang Pag-atake (Threat Monitor)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{threats.length} Total Incidents</span>
            </div>

            {threats.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <GlobeLock className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-100">Ligtas at Walang Aktibong Banta!</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Kapag may bot o attacker na nagtangkang mag-DDoS, mag-flood ng requests, o manghula ng password, agad itong lilitaw dito na may 1-click ban option.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] bg-slate-950/20">
                      <th className="p-4">Attacker IP Address</th>
                      <th className="p-4">Uri ng Banta</th>
                      <th className="p-4">Detalye & Endpoint</th>
                      <th className="p-4">Dalas (Attempts)</th>
                      <th className="p-4">Huling Petsa</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Aksyon ng Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {threats.map(t => {
                      const badge = threatTypeBadges[t.threatType] || { label: t.threatType, bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition">
                          <td className="p-4 font-mono font-bold text-slate-100">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">
                              {t.ip}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 max-w-xs">
                            <p className="truncate font-semibold text-slate-200">{t.details}</p>
                            {t.endpoint && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{t.endpoint}</p>}
                          </td>
                          <td className="p-4 font-mono font-bold text-amber-400">
                            {t.attemptCount}x
                          </td>
                          <td className="p-4 text-slate-400">
                            {t.lastDetectedAt ? new Date(t.lastDetectedAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="p-4">
                            {t.isBlocked ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1 w-fit">
                                <Ban className="w-3 h-3" /> BLOCKED / BANNED
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1 w-fit animate-pulse">
                                <AlertCircle className="w-3 h-3" /> ACTIVE THREAT
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {t.isBlocked ? (
                              <button
                                onClick={() => handleUnblockIp(t.ip)}
                                disabled={actionLoadingId === t.ip}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition flex items-center gap-1 ml-auto disabled:opacity-50"
                              >
                                {actionLoadingId === t.ip ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                <span>I-unblock</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockIp(t.ip, t.details)}
                                disabled={actionLoadingId === t.ip}
                                className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl font-bold text-xs transition flex items-center gap-1 ml-auto shadow-md shadow-rose-600/30 disabled:opacity-50"
                              >
                                {actionLoadingId === t.ip ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                                <span>I-block ang IP</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Firewall Blacklist (Permanently Blocked IPs) */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-black text-slate-100">
                  Firewall Blacklist (Naka-block na IP Addresses)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-400">{blockedIps.length} Total Blocked</span>
            </div>

            {blockedIps.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Walang IP address na kasalukuyang naka-block sa firewall blacklist.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase font-bold text-[11px] bg-slate-950/20">
                      <th className="p-4">Blocked IP</th>
                      <th className="p-4">Dahilan ng Pag-block</th>
                      <th className="p-4">Inaprubahan Ni</th>
                      <th className="p-4">Petsa ng Pag-block</th>
                      <th className="p-4 text-right">Aksyon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {blockedIps.map(b => (
                      <tr key={b.ip} className="hover:bg-slate-800/30 transition">
                        <td className="p-4 font-mono font-bold text-rose-400">{b.ip}</td>
                        <td className="p-4 text-slate-300">{b.reason}</td>
                        <td className="p-4 text-slate-400">{b.blockedBy || 'MDRRMO Admin'}</td>
                        <td className="p-4 text-slate-400">{b.blockedAt ? new Date(b.blockedAt).toLocaleString() : 'N/A'}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleUnblockIp(b.ip)}
                            disabled={actionLoadingId === b.ip}
                            className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ml-auto disabled:opacity-50"
                          >
                            {actionLoadingId === b.ip ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>I-unblock (Allow)</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Block IP Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-rose-500/30 w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                Mag-block ng Attacker IP Address
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase">IP Address</label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={e => setManualIp(e.target.value)}
                  placeholder="Hal. 192.168.1.100 o 203.177.42.1"
                  className="w-full mt-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-sm focus:border-rose-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 uppercase">Dahilan (Reason)</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={e => setManualReason(e.target.value)}
                  placeholder="Hal. DDoS flooding, password brute-force attack"
                  className="w-full mt-1 p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:border-rose-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Kanselahin
              </button>
              <button
                onClick={() => handleBlockIp(manualIp, manualReason)}
                disabled={!manualIp.trim() || actionLoadingId === manualIp}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoadingId === manualIp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>I-Block ang IP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

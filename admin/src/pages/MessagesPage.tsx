import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Image as ImageIcon,
  CheckCheck,
  User as UserIcon,
  Phone,
  MapPin,
  Shield,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Api } from '../services/api';
import { AdminSocket } from '../services/socketService';
import { Modal } from '../components/Common/Modal';

interface Conversation {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientRoleTitle: string;
  recipientBarangay: string;
  lastMessage: string;
  lastMessageAt: string | null;
  lastSenderId: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl?: string | null;
  type: string;
  createdAt: string;
  isSeen?: boolean;
}

interface Responder {
  id: string;
  fullName: string;
  roleTitle: string;
  barangayName: string;
  role: string;
  phone?: string;
  username?: string;
}

export const MessagesPage: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // New Chat modal states
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loadingResponders, setLoadingResponders] = useState(false);
  const [responderSearch, setResponderSearch] = useState('');

  // Attached image
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const adminUser = (() => {
    try {
      const raw = localStorage.getItem('irosin_admin_user');
      return raw ? JSON.parse(raw) : { id: 'usr-admin', fullName: 'MDRRMO Admin' };
    } catch {
      return { id: 'usr-admin', fullName: 'MDRRMO Admin' };
    }
  })();

  const currentAdminId = adminUser?.id || 'usr-admin';

  // Scroll to bottom of message list
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  // Join admin room and listen for real-time messages
  useEffect(() => {
    AdminSocket.joinUserRoom(currentAdminId);
    AdminSocket.joinUserRoom('usr-admin');

    const unsubNewMsg = AdminSocket.on('chat:new_message', (data: any) => {
      if (!data || !data.chatId || !data.message) return;

      const incomingMsg: Message = data.message;
      const incomingChatId = data.chatId;

      // Update conversations list
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.chatId === incomingChatId);
        const preview = incomingMsg.type === 'image' ? '📷 Nagpadala ng larawan' : incomingMsg.text || '';

        if (idx >= 0) {
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.lastMessage = preview;
          conv.lastMessageAt = incomingMsg.createdAt;
          conv.lastSenderId = incomingMsg.senderId;
          if (incomingMsg.senderId !== currentAdminId && selectedChat?.chatId !== incomingChatId) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          updated.splice(idx, 1);
          return [conv, ...updated];
        } else {
          const newConv: Conversation = {
            chatId: incomingChatId,
            recipientId: incomingMsg.senderId === currentAdminId ? data.recipientId : incomingMsg.senderId,
            recipientName: data.senderName || 'Responder',
            recipientRoleTitle: data.senderRoleTitle || 'Barangay Responder',
            recipientBarangay: data.senderBarangay || 'Irosin',
            lastMessage: preview,
            lastMessageAt: incomingMsg.createdAt,
            lastSenderId: incomingMsg.senderId,
            unreadCount: incomingMsg.senderId !== currentAdminId ? 1 : 0,
          };
          return [newConv, ...prev];
        }
      });

      // If currently viewing this chat, append message live!
      if (selectedChat && selectedChat.chatId === incomingChatId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === incomingMsg.id)) return prev;
          return [...prev, incomingMsg];
        });
        setTimeout(() => scrollToBottom(true), 100);
      }
    });

    return () => {
      unsubNewMsg();
      AdminSocket.leaveUserRoom(currentAdminId);
      AdminSocket.leaveUserRoom('usr-admin');
    };
  }, [currentAdminId, selectedChat]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConv(true);
    try {
      const res = await Api.getChatConversations();
      setConversations(res.conversations || []);
      if (!selectedChat && res.conversations && res.conversations.length > 0) {
        handleSelectConversation(res.conversations[0]);
      }
    } catch (err: any) {
      console.warn('[MessagesPage] loadConversations notice:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  // Load messages for a specific conversation
  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedChat(conv);
    setLoadingMsgs(true);
    try {
      // Mark as read
      Api.markChatRead(conv.chatId).catch(() => {});
      setConversations((prev) =>
        prev.map((c) => (c.chatId === conv.chatId ? { ...c, unreadCount: 0 } : c))
      );

      const res = await Api.getChatMessages(conv.chatId);
      const list = res.messages || [];
      // API returns newest first, reverse for chat window
      setMessages([...list].reverse());
      setTimeout(() => scrollToBottom(false), 80);
    } catch (err) {
      console.warn('[MessagesPage] getChatMessages notice:', err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // Open modal to start new chat with responders
  const openNewChatModal = async () => {
    setIsNewChatOpen(true);
    setLoadingResponders(true);
    try {
      const res = await Api.getChatResponders();
      setResponders(res.responders || []);
    } catch (err) {
      console.error('[MessagesPage] getChatResponders error:', err);
    } finally {
      setLoadingResponders(false);
    }
  };

  const handleStartChatWithResponder = (resp: Responder) => {
    setIsNewChatOpen(false);

    // Deterministic chat ID
    const sortedIds = [currentAdminId, resp.id].sort();
    const generatedChatId = sortedIds.join('_');

    const existing = conversations.find((c) => c.chatId === generatedChatId || c.recipientId === resp.id);
    if (existing) {
      handleSelectConversation(existing);
    } else {
      const newConv: Conversation = {
        chatId: generatedChatId,
        recipientId: resp.id,
        recipientName: resp.fullName,
        recipientRoleTitle: resp.roleTitle || resp.role,
        recipientBarangay: resp.barangayName || 'Irosin',
        lastMessage: 'Sinimulan ang usapan',
        lastMessageAt: new Date().toISOString(),
        lastSenderId: currentAdminId,
        unreadCount: 0,
      };
      setConversations((prev) => [newConv, ...prev]);
      handleSelectConversation(newConv);
    }
  };

  // Handle local image attachment
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setAttachedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Send message as MDRRMO ADMIN @admin
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChat) return;

    const textToSend = inputText.trim();
    const hasImage = !!attachedImage;

    if (!textToSend && !hasImage) return;

    setSending(true);
    try {
      const payload: any = {
        recipientId: selectedChat.recipientId,
        senderId: currentAdminId,
        senderName: 'MDRRMO Admin',
        type: hasImage ? 'image' : 'text',
      };

      if (hasImage) {
        payload.imageUrl = attachedImage;
      }
      if (textToSend) {
        payload.text = textToSend;
      }

      const res = await Api.sendChatMessage(payload);
      if (res && res.message) {
        setMessages((prev) => [...prev, res.message]);
        setInputText('');
        setAttachedImage(null);
        setTimeout(() => scrollToBottom(true), 80);
      }
    } catch (err: any) {
      console.error('[MessagesPage] Send message error:', err);
      alert('Hindi naipadala ang mensahe. Pakisuri ang koneksyon sa server.');
    } finally {
      setSending(false);
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.recipientName.toLowerCase().includes(q) ||
      c.recipientBarangay.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  const filteredResponders = responders.filter((r) => {
    const q = responderSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.barangayName.toLowerCase().includes(q) ||
      r.roleTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col space-y-3">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <span>MDRRMO Operations Live Chat Portal</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                @admin
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Direktang komunikasyon at dispatch sa mga mobile responders at barangay action officers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openNewChatModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Bagong Usapan</span>
          </button>
          <button
            onClick={loadConversations}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="I-refresh ang mga mensahe"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Chat Container */}
      <div className="flex-1 flex glass-panel rounded-2xl overflow-hidden border border-slate-800/80 min-h-0">
        {/* ── Left Column: Conversation Directory ── */}
        <div className="w-80 md:w-96 border-r border-slate-800/80 flex flex-col bg-slate-950/60 shrink-0">
          {/* Search Box */}
          <div className="p-3 border-b border-slate-800/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Maghanap ng responder o barangay..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {loadingConv ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span>Kinukuha ang mga usapan...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <p>Walang natagpuang usapan.</p>
                <button
                  onClick={openNewChatModal}
                  className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition"
                >
                  + Magsimula ng chat
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = selectedChat?.chatId === c.chatId;
                const hasUnread = c.unreadCount > 0;

                return (
                  <button
                    key={c.chatId}
                    onClick={() => handleSelectConversation(c)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition ${
                      isSelected ? 'bg-blue-600/15 border-l-4 border-blue-500' : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-xs text-slate-200 shrink-0 border border-slate-700 shadow-sm">
                      {c.recipientName.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-sm truncate font-bold ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                          {c.recipientName}
                        </span>
                        {c.lastMessageAt && (
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{c.recipientBarangay || 'Irosin'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="truncate text-slate-500">{c.recipientRoleTitle || 'Responder'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${hasUnread ? 'text-slate-200 font-bold' : 'text-slate-400'}`}>
                          {c.lastMessage || 'Walang mensahe'}
                        </p>
                        {hasUnread && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Active Conversation Messages & Composer ── */}
        <div className="flex-1 flex flex-col bg-slate-900/40 min-w-0">
          {selectedChat ? (
            <>
              {/* Active Chat Header */}
              <div className="p-3.5 px-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-sm shrink-0">
                    {selectedChat.recipientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-slate-100 text-sm sm:text-base leading-tight truncate">
                      {selectedChat.recipientName}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="text-emerald-400">● Aktibo</span>
                      <span className="text-slate-600">|</span>
                      <span>Brgy. {selectedChat.recipientBarangay || 'Irosin'}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">{selectedChat.recipientRoleTitle || 'Responder'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-semibold">
                    Konektado sa Mobile App
                  </span>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingMsgs ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                    <span>Kinukuha ang mensahe...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-600" />
                    <p>Wala pang palitan ng mensahe.</p>
                    <p className="text-[11px] text-slate-600">Sumulat ng mensahe sa ibaba upang mag-reply bilang MDRRMO Admin.</p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isFromAdmin = m.senderId === currentAdminId || m.senderName?.toLowerCase().includes('admin');

                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isFromAdmin ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender Label */}
                        <span className="text-[10px] font-bold text-slate-500 mb-1 px-1">
                          {isFromAdmin ? 'MDRRMO ADMIN (@admin)' : m.senderName}
                        </span>

                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl shadow-sm text-xs sm:text-sm leading-relaxed ${
                            isFromAdmin
                              ? 'bg-blue-600 text-white rounded-tr-none border border-blue-500/40'
                              : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/80'
                          }`}
                        >
                          {/* Attached Image */}
                          {m.imageUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-h-64 bg-slate-950/80">
                              <img
                                src={m.imageUrl}
                                alt="Shared"
                                className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition"
                                onClick={() => window.open(m.imageUrl || '', '_blank')}
                              />
                            </div>
                          )}

                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 px-1">
                          <span>
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isFromAdmin && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached Image Preview capsule */}
              {attachedImage && (
                <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={attachedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                    <span className="text-xs text-slate-300 font-medium">May nakakabit na larawan</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedImage(null)}
                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Composer Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400 hover:border-blue-500/40 transition shrink-0"
                  title="Maglakip ng litrato"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Sumulat ng opisyal na mensahe bilang MDRRMO ADMIN @admin..."
                  className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !attachedImage)}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition disabled:opacity-40 disabled:hover:bg-blue-600 shadow-md shadow-blue-600/20 shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Ipadala</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-800 text-slate-500">
                <MessageSquare className="w-12 h-12" />
              </div>
              <h3 className="text-base font-bold text-slate-200">Walang Nakabukas na Usapan</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Pumili ng usapan mula sa kaliwang listahan o magsimula ng bagong koordinasyon sa mga responder at opisyal ng Irosin.
              </p>
              <button
                onClick={openNewChatModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20"
              >
                + Bagong Usapan sa Responder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal: Select responder from list */}
      <Modal isOpen={isNewChatOpen} onClose={() => setIsNewChatOpen(false)} title="Magsimula ng Usapan sa Responder">
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={responderSearch}
              onChange={(e) => setResponderSearch(e.target.value)}
              placeholder="I-type ang pangalan ng responder o barangay..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950">
            {loadingResponders ? (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span>Kinukuha ang direktoryo ng responders...</span>
              </div>
            ) : filteredResponders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Walang natagpuang responder.
              </div>
            ) : (
              filteredResponders.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleStartChatWithResponder(r)}
                  className="w-full text-left p-3 hover:bg-slate-900 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700">
                      {r.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate">{r.fullName}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {r.roleTitle || 'Responder'} • {r.barangayName || 'Irosin'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-blue-400 shrink-0">Piliin →</span>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

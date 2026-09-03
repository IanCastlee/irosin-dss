import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { usePreferences } from '../../context/PreferencesContext';
import { Api } from '../../services/api';
import { RealtimeSocket } from '../../services/socketService';
import { soundService } from '../../services/soundService';
import { OfflineBanner } from '../../components/OfflineBanner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Responder {
  id: string;
  fullName: string;
  roleTitle: string;
  barangayName: string;
  role: string;
  phone?: string;
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffDays === 1) return 'Kahapon';
  if (diffDays < 7) return d.toLocaleDateString('fil-PH', { weekday: 'short' });
  return d.toLocaleDateString('fil-PH', { month: 'short', day: 'numeric' });
}

const AVATAR_PALETTE = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#65a30d'];
function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/** Guarantee unique conversations by chatId */
function dedupeConversations(list: Conversation[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const c of list) {
    if (c && c.chatId) {
      map.set(c.chatId, c);
    }
  }
  return Array.from(map.values());
}

/** Guarantee unique responders by id */
function dedupeResponders(list: Responder[]): Responder[] {
  const map = new Map<string, Responder>();
  for (const r of list) {
    if (r && r.id) {
      map.set(r.id, r);
    }
  }
  return Array.from(map.values());
}

// ─── Avatar Component ─────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const bg = avatarBg(name);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{getInitials(name)}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const ChatListScreen = ({ navigation }: any) => {
  const { colors, theme, language } = usePreferences();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  // Active tab: 'conversations' is FIRST and DEFAULT ACTIVE
  const [tab, setTab] = useState<'conversations' | 'responders'>('conversations');

  // ── Responders State ────────────────────────────────────────────────────────
  const [responders, setResponders] = useState<Responder[]>([]);
  const [respLoading, setRespLoading] = useState(false);
  const [respRefreshing, setRespRefreshing] = useState(false);
  const [respLoadingMore, setRespLoadingMore] = useState(false);
  const [respNextCursor, setRespNextCursor] = useState<string | null>(null);
  const [respHasMore, setRespHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Conversations State ─────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [convRefreshing, setConvRefreshing] = useState(false);
  const [convLoadingMore, setConvLoadingMore] = useState(false);
  const [convNextCursor, setConvNextCursor] = useState<string | null>(null);
  const [convHasMore, setConvHasMore] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // ── Chat Settings State ─────────────────────────────────────────────────────
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatPushEnabled, setChatPushEnabled] = useState(true);
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);

  const loadChatSettings = async () => {
    try {
      const pushVal = await AsyncStorage.getItem('@setting_chat_push_notif');
      if (pushVal !== null) setChatPushEnabled(JSON.parse(pushVal));

      const soundVal = await AsyncStorage.getItem('@setting_chat_sound');
      if (soundVal !== null) setChatSoundEnabled(JSON.parse(soundVal));
    } catch {}
  };

  const toggleChatPush = async (val: boolean) => {
    setChatPushEnabled(val);
    await AsyncStorage.setItem('@setting_chat_push_notif', JSON.stringify(val));
  };

  const toggleChatSound = async (val: boolean) => {
    setChatSoundEnabled(val);
    await AsyncStorage.setItem('@setting_chat_sound', JSON.stringify(val));
  };

  // ── Load credentials & Offline Cache on Mount ───────────────────────────────
  useEffect(() => {
    const init = async () => {
      let token: string | null = null;
      let myId: string | null = null;
      try {
        const pairs = await AsyncStorage.multiGet([
          '@responder_jwt_token',
          '@responder_token',
          '@responder_user_session',
          '@responder_profile',
          '@responder_status_cache',
        ]);
        token = pairs[0][1] || pairs[1][1] || null;
        const sessionRaw = pairs[2][1] || pairs[3][1] || pairs[4][1] || null;
        if (sessionRaw) {
          try {
            const p = JSON.parse(sessionRaw);
            if (p?.id) myId = p.id;
          } catch {}
        }
        setAuthToken(token);
        setMyUserId(myId);

        // 1. Instant Cache Hydration (<10ms)
        if (myId) {
          const cachedConv = await AsyncStorage.getItem(`@chat_conversations_cache_${myId}`);
          if (cachedConv) {
            try {
              const parsed = JSON.parse(cachedConv);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const clean = dedupeConversations(parsed);
                setConversations(clean);
                setTotalUnread(clean.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0));
              }
            } catch {}
          }
        }
        const cachedResp = await AsyncStorage.getItem('@chat_responders_cache');
        if (cachedResp) {
          try {
            const parsed = JSON.parse(cachedResp);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setResponders(dedupeResponders(parsed));
            }
          } catch {}
        }
        loadChatSettings();

        // 2. Auto-register Push Token for Chat & Responder Alerts
        try {
          const { status } = await Notifications.getPermissionsAsync();
          let finalStatus = status;
          if (finalStatus !== 'granted') {
            const { status: reqStatus } = await Notifications.requestPermissionsAsync();
            finalStatus = reqStatus;
          }
          if (finalStatus === 'granted') {
            const tokenRes = await Notifications.getExpoPushTokenAsync().catch(() => null);
            if (tokenRes?.data) {
              Api.registerChatPushToken(token, tokenRes.data).catch(() => {});
              Api.registerPushToken(tokenRes.data).catch(() => {});
            }
          }
        } catch (pushErr) {
          console.warn('[ChatList] Push token registration warning:', pushErr);
        }
      } catch (err) {
        console.warn('[ChatList] Session init warning:', err);
      } finally {
        // 3. Fetch fresh updates silently in background (if online)
        loadConversations(token, false, undefined, myId);
        loadResponders(token, false, '', undefined, myId);
      }
    };

    init();
  }, []);

  // Reload conversations whenever screen gains focus
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      loadConversations(authToken, false);
    });
    return unsubFocus;
  }, [navigation, authToken]);

  // ── Join room & real-time listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!myUserId) return;
    RealtimeSocket.joinUserRoom(myUserId);

    // New message arrived
    const unsubNewMsg = RealtimeSocket.on('chat:new_message', (data: any) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c.chatId === data.chatId);
        const msg = data.message;
        const preview = msg.type === 'image' ? '📷 Nagpadala ng larawan' : (msg.text || '');

        let updatedList: Conversation[];
        if (idx >= 0) {
          const updated = [...prev];
          const conv = { ...updated[idx] };
          conv.lastMessage = preview;
          conv.lastMessageAt = msg.createdAt;
          conv.lastSenderId = msg.senderId;
          if (msg.senderId !== myUserId) conv.unreadCount = (conv.unreadCount || 0) + 1;
          updated.splice(idx, 1);
          updatedList = dedupeConversations([conv, ...updated]);
        } else {
          // New conversation
          const newConv: Conversation = {
            chatId: data.chatId,
            recipientId: data.senderId === myUserId ? data.recipientId : data.senderId,
            recipientName: data.senderName || 'Responder',
            recipientRoleTitle: data.senderRoleTitle || 'Responder',
            recipientBarangay: data.senderBarangay || '',
            lastMessage: preview,
            lastMessageAt: msg.createdAt,
            lastSenderId: msg.senderId,
            unreadCount: msg.senderId !== myUserId ? 1 : 0,
          };
          updatedList = dedupeConversations([newConv, ...prev]);
        }

        // Update local conversations cache
        AsyncStorage.setItem(`@chat_conversations_cache_${myUserId}`, JSON.stringify(updatedList)).catch(() => {});

        // Also save incoming message directly into individual chat cache so ChatWindowScreen opens instantly with the new message!
        if (data.chatId && data.message) {
          AsyncStorage.getItem(`@chat_cache_${data.chatId}`).then(cachedRaw => {
            let existingList: any[] = [];
            if (cachedRaw) {
              try { existingList = JSON.parse(cachedRaw); } catch {}
            }
            const exists = existingList.some(m => m.id === data.message.id);
            if (!exists) {
              const updatedChatMsgs = [data.message, ...existingList].slice(0, 50);
              AsyncStorage.setItem(`@chat_cache_${data.chatId}`, JSON.stringify(updatedChatMsgs)).catch(() => {});
            }
          }).catch(() => {});
        }

        return updatedList;
      });

      const isMine = (data.message?.senderId && data.message?.senderId === myUserId) || (data.senderId && data.senderId === myUserId);
      if (!isMine) {
        setTotalUnread(prev => prev + 1);
        soundService.playChatMessageSound().catch(() => {});
      }
    });

    // Message edited / unsent update preview in conversation list
    const unsubConvUpdate = RealtimeSocket.on('chat:conversation_updated', (data: any) => {
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.chatId === data.chatId) {
            return {
              ...c,
              lastMessage: data.lastMessage !== undefined ? data.lastMessage : c.lastMessage,
              lastMessageAt: data.lastMessageAt || c.lastMessageAt,
              lastSenderId: data.lastSenderId || c.lastSenderId,
            };
          }
          return c;
        });
        const deduped = dedupeConversations(updated);
        AsyncStorage.setItem(`@chat_conversations_cache_${myUserId}`, JSON.stringify(deduped)).catch(() => {});
        return deduped;
      });
    });

    return () => {
      unsubNewMsg();
      unsubConvUpdate();
    };
  }, [myUserId, authToken]);

  // ── Load responders (Safe offline fallback) ─────────────────────────────────
  const loadResponders = useCallback(async (
    token?: string | null,
    showSpinner?: boolean,
    q?: string,
    cursor?: string,
    currentUserId?: string | null
  ) => {
    try {
      if (showSpinner && responders.length === 0) setRespLoading(true);
      const activeUserId = currentUserId || myUserId;
      const result = await Api.getChatResponders(token || authToken, q || undefined, cursor);
      let incoming = result.responders || [];
      incoming = incoming.filter(r => {
        const isChiefAdmin =
          r.id === 'usr-admin' ||
          (r as any).email === 'mdrmo.admin@irosin.gov.ph' ||
          r.role === 'MDRRMO_ADMIN' ||
          (r.fullName || '').toLowerCase().includes('mdrrmo chief admin officer');
        return r.id !== activeUserId && !isChiefAdmin;
      });
      if (incoming.length > 0 || (!cursor && !q)) {
        setResponders(prev => {
          const newList = (!cursor && !q) ? incoming : [...prev, ...incoming];
          const deduped = dedupeResponders(newList);
          if (!q) {
            AsyncStorage.setItem('@chat_responders_cache', JSON.stringify(deduped)).catch(() => {});
          }
          return deduped;
        });
      }
      setRespNextCursor(result.nextCursor);
      setRespHasMore(result.hasMore);
    } catch (err) {
      console.warn('[ChatList] loadResponders offline/notice:', err);
      // Retain existing cached responders
    } finally {
      setRespLoading(false);
    }
  }, [authToken, myUserId, responders.length]);

  const onRespRefresh = async () => {
    setRespRefreshing(true);
    setSearchQuery('');
    await loadResponders(authToken, true, '');
    setRespRefreshing(false);
  };

  const onRespLoadMore = async () => {
    if (!respHasMore || respLoadingMore) return;
    setRespLoadingMore(true);
    await loadResponders(authToken, false, searchQuery, respNextCursor || undefined);
    setRespLoadingMore(false);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setRespLoading(true);
      await loadResponders(authToken, true, q);
      setRespLoading(false);
    }, 350);
  };

  // ── Load conversations (Safe offline fallback) ──────────────────────────────
  const loadConversations = useCallback(async (
    token?: string | null,
    showSpinner?: boolean,
    cursor?: string,
    currentUserId?: string | null
  ) => {
    try {
      const activeUserId = currentUserId || myUserId;
      if (showSpinner && conversations.length === 0) setConvLoading(true);
      const result = await Api.getChatConversations(token || authToken, cursor);
      const incoming = result.conversations || [];

      if (incoming.length > 0 || cursor) {
        setConversations(prev => {
          let updatedList: Conversation[];
          if (!cursor) {
            updatedList = incoming;
          } else {
            updatedList = [...prev, ...incoming];
          }
          const deduped = dedupeConversations(updatedList);
          setTotalUnread(deduped.reduce((sum, c) => sum + (c.unreadCount || 0), 0));

          if (activeUserId) {
            AsyncStorage.setItem(`@chat_conversations_cache_${activeUserId}`, JSON.stringify(deduped)).catch(() => {});
          }
          return deduped;
        });
      }

      setConvNextCursor(result.nextCursor);
      setConvHasMore(result.hasMore);
    } catch (err) {
      console.warn('[ChatList] loadConversations offline/notice:', err);
      // Retain existing cached conversations in state
    } finally {
      setConvLoading(false);
    }
  }, [authToken, myUserId, conversations.length]);

  // Load conversations on tab switch
  useEffect(() => {
    if (tab === 'conversations') {
      loadConversations(authToken, false);
    } else if (tab === 'responders' && responders.length === 0) {
      loadResponders(authToken, true);
    }
  }, [tab, authToken]);

  const onConvRefresh = async () => {
    setConvRefreshing(true);
    await loadConversations(authToken, true);
    setConvRefreshing(false);
  };

  const onConvLoadMore = async () => {
    if (!convHasMore || convLoadingMore) return;
    setConvLoadingMore(true);
    await loadConversations(authToken, false, convNextCursor || undefined);
    setConvLoadingMore(false);
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const openChat = (
    recipientId: string,
    recipientName: string,
    recipientRoleTitle: string,
    recipientBarangay: string,
    chatId?: string,
    recipientPhone?: string,
  ) => {
    navigation.navigate('ChatWindow', {
      recipientId,
      recipientName,
      recipientRoleTitle,
      recipientBarangay,
      chatId,
      recipientPhone,
    });
  };

  // ── Render: Responder Item ──────────────────────────────────────────────────
  const renderResponder = ({ item }: { item: Responder }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}
      onPress={() => openChat(item.id, item.fullName, item.roleTitle, item.barangayName, undefined, item.phone)}
      activeOpacity={0.7}
    >
      <Avatar name={item.fullName} size={50} />
      <View style={styles.rowContent}>
        <Text style={[styles.rowName, { color: colors.text }]}>{item.fullName}</Text>
        <Text style={[styles.rowSub, { color: colors.textMuted }]}>
          {item.roleTitle}
        </Text>
        {item.barangayName ? (
          <View style={styles.barangayPill}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={[styles.barangayText, { color: colors.textMuted }]}>
              {item.barangayName}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chatbubble-outline" size={18} color={colors.primaryLight} style={{ opacity: 0.7 }} />
    </TouchableOpacity>
  );

  // ── Render: Conversation Item ───────────────────────────────────────────────
  const renderConversation = ({ item }: { item: Conversation }) => {
    const isUnread = item.unreadCount > 0;
    const isMine = item.lastSenderId === myUserId;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}
        onPress={() => openChat(item.recipientId, item.recipientName, item.recipientRoleTitle, item.recipientBarangay, item.chatId)}
        activeOpacity={0.7}
      >
        <Avatar name={item.recipientName} size={50} />
        <View style={styles.rowContent}>
          <View style={styles.convTopRow}>
            <Text style={[styles.rowName, { color: colors.text }, isUnread && { fontWeight: '800' }]} numberOfLines={1}>
              {item.recipientName}
            </Text>
            <Text style={[styles.convTime, { color: isUnread ? colors.primaryLight : colors.textMuted }]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.convBottomRow}>
            <Text
              style={[
                styles.convPreview,
                { color: isUnread ? colors.text : colors.textSecondary },
                isUnread && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {isMine ? `Ikaw: ${item.lastMessage}` : item.lastMessage}
            </Text>
            {isUnread && (
              <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={styles.badgeText}>{item.unreadCount > 9 ? '9+' : item.unreadCount}</Text>
              </View>
            )}
          </View>
          {item.recipientBarangay ? (
            <Text style={[styles.convBarangay, { color: colors.textMuted }]} numberOfLines={1}>
              {item.recipientRoleTitle}{item.recipientBarangay ? ` • ${item.recipientBarangay}` : ''}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Status Bar (Edge-to-Edge compatible) ── */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* ── Top Header ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.headerIcon, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="chatbubbles" size={20} color={colors.primaryLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {language === 'tl' ? 'Mensahe' : 'Messages'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            {language === 'tl' ? 'Pribadong koordinasyon ng mga Responders' : 'Direct Responder Coordination'}
          </Text>
        </View>

        {/* ⚙️ Chat Settings Button */}
        <TouchableOpacity
          onPress={() => setShowSettingsModal(true)}
          style={{
            padding: 8,
            borderRadius: 10,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.cardBorder,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Offline Status Banner ── */}
      <OfflineBanner />

      {/* ── Tab Bar: 1. Mga Usapan (FIRST & DEFAULT) | 2. Mga Responder ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        {/* Tab 1: Mga Usapan */}
        <TouchableOpacity
          style={[styles.tab, tab === 'conversations' && [styles.tabActive, { borderBottomColor: colors.primaryLight }]]}
          onPress={() => setTab('conversations')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'conversations' ? 'chatbubbles' : 'chatbubbles-outline'}
            size={17}
            color={tab === 'conversations' ? colors.primaryLight : colors.textMuted}
          />
          <Text style={[styles.tabText, { color: tab === 'conversations' ? colors.primaryLight : colors.textMuted }]}>
            {language === 'tl' ? 'Mga Usapan' : 'Conversations'}
          </Text>
          {totalUnread > 0 && (
            <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.badgeText}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tab 2: Mga Responder */}
        <TouchableOpacity
          style={[styles.tab, tab === 'responders' && [styles.tabActive, { borderBottomColor: colors.primaryLight }]]}
          onPress={() => setTab('responders')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={tab === 'responders' ? 'people' : 'people-outline'}
            size={17}
            color={tab === 'responders' ? colors.primaryLight : colors.textMuted}
          />
          <Text style={[styles.tabText, { color: tab === 'responders' ? colors.primaryLight : colors.textMuted }]}>
            {language === 'tl' ? 'Mga Responder' : 'Responders'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab 1: Conversations Tab Content ── */}
      {tab === 'conversations' && (
        convLoading && conversations.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Kinukuha ang mga usapan...' : 'Loading conversations...'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={item => item.chatId}
            renderItem={renderConversation}
            refreshControl={
              <RefreshControl refreshing={convRefreshing} onRefresh={onConvRefresh} tintColor={colors.primaryLight} />
            }
            onEndReached={onConvLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="chatbubbles-outline" size={42} color={colors.primaryLight} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'tl' ? 'Wala pang Usapan' : 'No Conversations Yet'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {language === 'tl'
                    ? 'Pumunta sa tab na "Mga Responder" sa itaas upang simulan ang pribadong pag-uusap.'
                    : 'Switch to the "Responders" tab above to start a conversation.'}
                </Text>
                <TouchableOpacity
                  style={[styles.startChatBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => setTab('responders')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color="#ffffff" />
                  <Text style={styles.startChatBtnText}>
                    {language === 'tl' ? 'Mag-chat ng Responder' : 'Start a Chat'}
                  </Text>
                </TouchableOpacity>
              </View>
            }
            ListFooterComponent={
              convLoadingMore ? (
                <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )
      )}

      {/* ── Tab 2: Responders Tab Content ── */}
      {tab === 'responders' && (
        <>
          {/* Search bar */}
          <View style={[styles.searchWrap, { backgroundColor: colors.bg, borderBottomColor: colors.cardBorder }]}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={language === 'tl' ? 'Hanapin ang responder o barangay...' : 'Search responder or barangay...'}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {respLoading && responders.length === 0 ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primaryLight} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {language === 'tl' ? 'Kinukuha ang mga responder...' : 'Loading responders...'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={responders}
              keyExtractor={item => item.id}
              renderItem={renderResponder}
              refreshControl={
                <RefreshControl refreshing={respRefreshing} onRefresh={onRespRefresh} tintColor={colors.primaryLight} />
              }
              onEndReached={onRespLoadMore}
              onEndReachedThreshold={0.3}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-outline" size={52} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {searchQuery ? 'Walang nahanap' : 'Walang registered responders'}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    {searchQuery
                      ? `Walang responder na tugma sa "${searchQuery}".`
                      : 'Walang ibang aktibong responders sa sistema.'}
                  </Text>
                </View>
              }
              ListFooterComponent={
                respLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 16 }} />
                ) : null
              }
            />
          )}
        </>
      )}

      {/* ⚙️ CHAT & MESSAGE NOTIFICATIONS SETTINGS MODAL */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1, borderRadius: 20, padding: 20 }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="settings-outline" size={20} color={colors.primaryLight} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: colors.text }}>
                  {language === 'tl' ? 'Setting ng Mensahe at Notipikasyon' : 'Chat & Notification Settings'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Toggle 1: Chat Push Notifications */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Ionicons name="chatbubbles-outline" size={15} color={colors.primaryLight} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>
                    {language === 'tl' ? 'Push Notifications sa Chat' : 'Chat Push Notifications'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 }}>
                  {language === 'tl'
                    ? 'Makatanggap ng pop-up notification kapag may bagong mensahe mula sa ibang responder.'
                    : 'Receive push notifications for incoming messages from other responders.'}
                </Text>
              </View>
              <Switch
                value={chatPushEnabled}
                onValueChange={toggleChatPush}
                trackColor={{ false: '#334155', true: colors.primaryLight }}
                thumbColor={chatPushEnabled ? '#ffffff' : '#94a3b8'}
              />
            </View>

            {/* Toggle 2: Chat Notification Sound */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Ionicons name="volume-medium-outline" size={15} color={colors.primaryLight} />
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>
                    {language === 'tl' ? 'Tunog ng Mensahe (Chat Sound)' : 'Message Notification Sound'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11.5, color: colors.textSecondary, lineHeight: 16 }}>
                  {language === 'tl'
                    ? 'Magpatunog ng alert chime kapag may natanggap na bagong mensahe habang nasa app.'
                    : 'Play an alert chime when a new message is received.'}
                </Text>
              </View>
              <Switch
                value={chatSoundEnabled}
                onValueChange={toggleChatSound}
                trackColor={{ false: '#334155', true: colors.primaryLight }}
                thumbColor={chatSoundEnabled ? '#ffffff' : '#94a3b8'}
              />
            </View>

            {/* Close / Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 16,
              }}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 13.5 }}>
                {language === 'tl' ? 'I-save at Isara' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: { padding: 4, borderRadius: 10 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub: { fontSize: 11, fontWeight: '500' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 13.5, fontWeight: '700' },

  // Search
  searchWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '500' },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  rowContent: { flex: 1, gap: 2 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, fontWeight: '500' },
  barangayPill: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  barangayText: { fontSize: 12, fontWeight: '500' },

  // Avatar
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800' },

  // Conversation-specific
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  convBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  convPreview: { fontSize: 13, flex: 1 },
  convTime: { fontSize: 11, fontWeight: '600' },
  convBarangay: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Badge
  badge: {
    minWidth: 18, height: 18, borderRadius: 9,
    paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // States
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 60 },
  loadingText: { fontSize: 13, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  startChatBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
  },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Dimensions,
  Clipboard,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePreferences } from '../../context/PreferencesContext';
import { Api } from '../../services/api';
import { RealtimeSocket } from '../../services/socketService';
import { soundService } from '../../services/soundService';
import { processImageToWebP } from '../../utils/imageUtils';
import { OfflineBanner } from '../../components/OfflineBanner';

interface ReplyInfo {
  id: string;
  senderName: string;
  text?: string | null;
  type: 'text' | 'image';
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string | null;
  imageUrl: string | null;
  type: 'text' | 'image';
  createdAt: string;
  isSeen?: boolean;
  isEdited?: boolean;
  editedAt?: string | null;
  reactions?: Record<string, string>;
  replyTo?: ReplyInfo | null;
  pending?: boolean;
}

const { width } = Dimensions.get('window');
const MAX_CACHE_MESSAGES = 50;
const EMOJI_LIST = ['❤️', '👍', '😮', '😂', '😢', '⚠️', '🙏'];

function formatMsgTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDateHeader(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Ngayon';
  if (diffDays === 1) return 'Kahapon';
  return d.toLocaleDateString('fil-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'R';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_PALETTE = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

/** Guarantee unique messages by ID */
function dedupeList(list: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const item of list) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

/** Save up to MAX_CACHE_MESSAGES to local disk */
async function saveMessagesCache(chatId: string, msgs: ChatMessage[]) {
  if (!chatId) return;
  try {
    const toSave = msgs.slice(0, MAX_CACHE_MESSAGES).filter(m => !m.pending);
    await AsyncStorage.setItem(`@chat_cache_${chatId}`, JSON.stringify(toSave));
  } catch {}
}

export const ChatWindowScreen = ({ navigation, route }: any) => {
  const { recipientId, recipientName, recipientRoleTitle, recipientBarangay } = route.params || {};
  const { colors, theme, language } = usePreferences();
  const insets = useSafeAreaInsets();

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>('Responder');
  const [myRoleTitle, setMyRoleTitle] = useState<string>('Barangay Responder');
  const [myBarangay, setMyBarangay] = useState<string>('');

  const [chatId, setChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [isSending, setIsSending] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Editing state
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);

  // Message Action Sheet (Long-Press Menu)
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<ChatMessage | null>(null);

  // Keyboard state for universal cross-device behavior (POCO, Xiaomi, Samsung, Pixel, iOS)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // 1. Listen for NetInfo Connectivity
  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return () => unsubNet();
  }, []);

  // 2. Listen for Keyboard State
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = () => {
      setIsKeyboardOpen(true);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    };
    const onHide = () => setIsKeyboardOpen(false);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 3. Initialize User Session & Deterministic Chat ID & Instant Cache Loading
  useEffect(() => {
    const init = async () => {
      try {
        const pairs = await AsyncStorage.multiGet([
          '@responder_jwt_token',
          '@responder_token',
          '@responder_user_session',
          '@responder_profile',
          '@responder_status_cache',
        ]);
        const token = pairs[0][1] || pairs[1][1] || null;
        const sessionRaw = pairs[2][1] || pairs[3][1] || pairs[4][1] || null;
        let currentUserId = 'resp-user';

        if (token) setAuthToken(token);
        if (sessionRaw) {
          try {
            const p = JSON.parse(sessionRaw);
            if (p?.id) currentUserId = p.id;
            if (p?.fullName) setMyName(p.fullName);
            if (p?.roleTitle || p?.role) setMyRoleTitle(p.roleTitle || p.role);
            if (p?.barangayName) setMyBarangay(p.barangayName);
          } catch {}
        }

        setMyUserId(currentUserId);

        // Always join personal room on backend
        RealtimeSocket.joinUserRoom(currentUserId);

        // Compute deterministic chatId
        const cId = [currentUserId, recipientId].sort().join('_');
        setChatId(cId);

        // Instant Cache Hydration (<10ms)
        const cached = await AsyncStorage.getItem(`@chat_cache_${cId}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              setLoading(false);
            }
          } catch {}
        }

        // Load fresh messages from server
        loadMessages(token, cId, !cached);
      } catch (err) {
        console.warn('[ChatWindow] Init error:', err);
        setLoading(false);
      }
    };

    init();
  }, [recipientId]);

  // 4. Load Messages (Safe Offline Cache Protection)
  const loadMessages = useCallback(async (token: string | null, activeChatId: string, showSpinner = false, cursor?: string) => {
    if (!activeChatId) return;
    try {
      if (showSpinner && messages.length === 0) setLoading(true);
      const result = await Api.getChatMessages(token, activeChatId, cursor);
      const incoming = (result.messages || []).map(m => ({ ...m, pending: false }));

      if (incoming.length > 0 || cursor) {
        if (!cursor) {
          const deduped = dedupeList(incoming);
          setMessages(deduped);
          saveMessagesCache(activeChatId, deduped);
        } else {
          setMessages(prev => {
            const deduped = dedupeList([...prev, ...incoming]);
            saveMessagesCache(activeChatId, deduped);
            return deduped;
          });
        }
      }
      setNextCursor(result.nextCursor);
      setHasMore(result.hasMore);

      // Mark conversation as read
      Api.markChatRead(token, activeChatId).catch(() => {});
    } catch (err) {
      console.warn('[ChatWindow] Network error, keeping cached messages:', err);
      // Keep cached messages in state intact
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-sync freshly whenever the screen is opened or focused
  useFocusEffect(
    useCallback(() => {
      if (chatId) {
        // Hydrate from local cache first to ensure 0-millisecond display
        AsyncStorage.getItem(`@chat_cache_${chatId}`).then(cached => {
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(prev => {
                  if (prev.length === 0 || parsed[0]?.id !== prev[0]?.id) {
                    return dedupeList(parsed);
                  }
                  return prev;
                });
              }
            } catch {}
          }
        });
        loadMessages(authToken, chatId, false);
      }
    }, [chatId, authToken, loadMessages])
  );

  // 5. Real-Time WebSocket Delivery & Live Action Listeners
  useEffect(() => {
    if (!chatId || !myUserId) return;

    // Incoming new message
    const unsubNewMsg = RealtimeSocket.on('chat:new_message', (data: any) => {
      const isThisChat = data.chatId === chatId ||
        (data.message?.senderId === recipientId) ||
        (data.message?.senderId === myUserId && data.chatId === chatId);

      if (!isThisChat) return;

      const incomingMsg: ChatMessage = {
        ...data.message,
        pending: false,
      };

      setMessages(prev => {
        const exists = prev.some(m => m.id === incomingMsg.id);
        let updated: ChatMessage[];
        if (exists) {
          updated = prev.map(m => m.id === incomingMsg.id ? incomingMsg : m);
        } else if (incomingMsg.senderId === myUserId) {
          const optIdx = prev.findIndex(m => m.pending && m.text === incomingMsg.text);
          if (optIdx >= 0) {
            const copy = [...prev];
            copy[optIdx] = incomingMsg;
            updated = dedupeList(copy);
          } else {
            updated = dedupeList([incomingMsg, ...prev]);
          }
        } else {
          updated = dedupeList([incomingMsg, ...prev]);
        }
        saveMessagesCache(chatId, updated);
        return updated;
      });

      const isFromRecipient = data.message?.senderId === recipientId && data.message?.senderId !== myUserId;
      if (isFromRecipient) {
        soundService.playChatMessageSound().catch(() => {});
        Api.markChatRead(authToken, chatId).catch(() => {});
      }
    });

    // Reaction updated
    const unsubReaction = RealtimeSocket.on('chat:reaction_updated', (data: any) => {
      if (data.chatId !== chatId) return;
      setMessages(prev => {
        const updated = prev.map(m => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m));
        saveMessagesCache(chatId, updated);
        return updated;
      });
    });

    // Message edited
    const unsubEdited = RealtimeSocket.on('chat:message_edited', (data: any) => {
      if (data.chatId !== chatId) return;
      setMessages(prev => {
        const updated = prev.map(m =>
          m.id === data.messageId
            ? { ...m, text: data.text, isEdited: true, editedAt: data.editedAt }
            : m
        );
        saveMessagesCache(chatId, updated);
        return updated;
      });
    });

    // Message unsent / deleted (Sync with local cache deletion)
    const unsubUnsent = RealtimeSocket.on('chat:message_unsent', (data: any) => {
      if (data.chatId !== chatId) return;
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== data.messageId);
        saveMessagesCache(chatId, updated);
        return updated;
      });
    });

    // Messages seen by recipient
    const unsubSeen = RealtimeSocket.on('chat:messages_seen', (data: any) => {
      if (data.chatId !== chatId) return;
      setMessages(prev => {
        const updated = prev.map(m => (m.senderId === myUserId ? { ...m, isSeen: true } : m));
        saveMessagesCache(chatId, updated);
        return updated;
      });
    });

    return () => {
      unsubNewMsg();
      unsubReaction();
      unsubEdited();
      unsubUnsent();
      unsubSeen();
    };
  }, [chatId, myUserId, recipientId, authToken]);

  const onLoadMore = async () => {
    if (!hasMore || loadingMore || !chatId) return;
    setLoadingMore(true);
    await loadMessages(authToken, chatId, false, nextCursor || undefined);
    setLoadingMore(false);
  };

  // 6. Send or Edit Message
  const handleSendPress = async () => {
    const text = inputText.trim();
    if (!text || !myUserId || !recipientId || isSending) return;

    // Handle Edit Mode
    if (editingMessage) {
      const msgIdToEdit = editingMessage.id;
      setIsSending(true);
      try {
        await Api.editChatMessage(authToken, chatId, msgIdToEdit, text, myUserId);
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === msgIdToEdit ? { ...m, text, isEdited: true, editedAt: new Date().toISOString() } : m
          );
          saveMessagesCache(chatId, updated);
          return updated;
        });
        setEditingMessage(null);
        setInputText('');
        setInputHeight(40);
      } catch (err: any) {
        Alert.alert(
          language === 'tl' ? 'Hindi Na-edit' : 'Edit Failed',
          err.message || 'Hindi na maaaring i-edit ang mensahe dahil nabasa na ng recipient.'
        );
      } finally {
        setIsSending(false);
      }
      return;
    }

    // Normal Send Mode (with optional ReplyTo payload)
    const currentReply = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName || 'Responder',
          text: replyingTo.text || (replyingTo.type === 'image' ? '📷 Larawan' : null),
          type: replyingTo.type,
        }
      : null;

    setInputText('');
    setInputHeight(40);
    setReplyingTo(null);
    setIsSending(true);

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimistic: ChatMessage = {
      id: tempId,
      senderId: myUserId,
      senderName: myName,
      text,
      imageUrl: null,
      type: 'text',
      createdAt: new Date().toISOString(),
      pending: true,
      isSeen: false,
      replyTo: currentReply,
    };

    setMessages(prev => dedupeList([optimistic, ...prev]));

    try {
      const result = await Api.sendChatMessage(authToken, {
        recipientId,
        type: 'text',
        text,
        replyTo: currentReply,
      });

      if (result?.message) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? { ...result.message, pending: false } : m);
          const deduped = dedupeList(updated);
          saveMessagesCache(chatId, deduped);
          return deduped;
        });
      }
    } catch (err: any) {
      console.warn('[ChatWindow] Send message error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert(
        language === 'tl' ? 'Hindi Naipadala' : 'Failed to Send',
        language === 'tl' ? 'Hindi maipadala ang mensahe. Pakisuri ang iyong koneksyon sa internet.' : (err.message || 'Could not send message.')
      );
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  // 7. Send Image Message
  const pickAndSendImage = async () => {
    if (isProcessingImage || isSending) return;

    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Pahintulot Kinakailangan', 'Payagan ang access sa gallery upang makapagpadala ng larawan.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;

    const uri = pickerResult.assets[0].uri;
    setIsProcessingImage(true);

    try {
      const processedUri = await processImageToWebP(uri);

      if (!myUserId || !recipientId) return;

      const currentReply = replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName || 'Responder',
            text: replyingTo.text || (replyingTo.type === 'image' ? '📷 Larawan' : null),
            type: replyingTo.type,
          }
        : null;

      setReplyingTo(null);
      setIsSending(true);
      const tempId = `temp_img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        senderId: myUserId,
        senderName: myName,
        text: null,
        imageUrl: processedUri,
        type: 'image',
        createdAt: new Date().toISOString(),
        pending: true,
        isSeen: false,
        replyTo: currentReply,
      };

      setMessages(prev => dedupeList([optimistic, ...prev]));

      const result = await Api.sendChatMessage(authToken, {
        recipientId,
        type: 'image',
        imageUrl: processedUri,
        replyTo: currentReply,
      });

      if (result?.message) {
        setMessages(prev => {
          const updated = prev.map(m => m.id === tempId ? { ...result.message, pending: false } : m);
          const deduped = dedupeList(updated);
          saveMessagesCache(chatId, deduped);
          return deduped;
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Hindi maiproseso ang larawan.');
    } finally {
      setIsProcessingImage(false);
      setIsSending(false);
    }
  };

  // 8. Reactions
  const handleReact = async (emoji: string) => {
    if (!selectedMessageForAction || !myUserId) return;
    const msgId = selectedMessageForAction.id;
    setSelectedMessageForAction(null);

    setMessages(prev => {
      const updated = prev.map(m => {
        if (m.id !== msgId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        if (currentReactions[myUserId] === emoji) {
          delete currentReactions[myUserId];
        } else {
          currentReactions[myUserId] = emoji;
        }
        return { ...m, reactions: currentReactions };
      });
      saveMessagesCache(chatId, updated);
      return updated;
    });

    try {
      await Api.reactToChatMessage(authToken, chatId, msgId, emoji, myUserId);
    } catch (err) {
      console.warn('[ChatWindow] React error:', err);
    }
  };

  // 9. Start Reply
  const handleStartReply = (msg: ChatMessage) => {
    setSelectedMessageForAction(null);
    setEditingMessage(null);
    setReplyingTo(msg);
  };

  // 10. Start Editing Message
  const handleStartEdit = (msg: ChatMessage) => {
    setSelectedMessageForAction(null);
    setReplyingTo(null);
    setEditingMessage(msg);
    setInputText(msg.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
    setInputHeight(40);
  };

  // 11. Unsend Message (Deletes from state and local disk cache)
  const handleUnsend = (msg: ChatMessage) => {
    setSelectedMessageForAction(null);

    Alert.alert(
      language === 'tl' ? 'Bawiin ang Mensahe?' : 'Unsend Message?',
      language === 'tl'
        ? 'Maaalis ang mensaheng ito para sa lahat ng kalahok sa usapan.'
        : 'This message will be removed for everyone in the conversation.',
      [
        { text: language === 'tl' ? 'Kanselahin' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tl' ? 'Bawiin (Unsend)' : 'Unsend',
          style: 'destructive',
          onPress: async () => {
            setMessages(prev => {
              const updated = prev.filter(m => m.id !== msg.id);
              saveMessagesCache(chatId, updated);
              return updated;
            });
            try {
              if (myUserId) {
                await Api.unsendChatMessage(authToken, chatId, msg.id, myUserId);
              }
            } catch (err: any) {
              Alert.alert(
                language === 'tl' ? 'Hindi Nabawi' : 'Unsend Failed',
                err.message || 'Hindi na maaaring bawiin ang mensahe dahil nabasa na ito ng recipient.'
              );
              loadMessages(authToken, chatId, true);
            }
          },
        },
      ]
    );
  };

  const handleCopyText = (text: string | null) => {
    if (text) {
      Clipboard.setString(text);
      Alert.alert(language === 'tl' ? 'Kinopya' : 'Copied', language === 'tl' ? 'Nai-copy na ang mensahe.' : 'Message copied to clipboard.');
    }
    setSelectedMessageForAction(null);
  };

  // 12. Render Message Item
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === myUserId;
    const prevItem = messages[index + 1];
    const showDateHeader = !prevItem || formatDateHeader(item.createdAt) !== formatDateHeader(prevItem.createdAt);

    const reactionEntries = Object.entries(item.reactions || {});
    const reactionCounts: Record<string, number> = {};
    reactionEntries.forEach(([_, emoji]) => {
      reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
    });
    const reactionSummary = Object.entries(reactionCounts);

    return (
      <View>
        {/* Date Separator */}
        {showDateHeader && (
          <View style={styles.dateHeaderWrap}>
            <View style={[styles.dateBadge, { backgroundColor: theme === 'dark' ? 'rgba(30,41,59,0.85)' : 'rgba(226,232,240,0.85)' }]}>
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatDateHeader(item.createdAt)}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
          {!isMine && (
            <View style={[styles.senderAvatar, { backgroundColor: avatarColor(item.senderName || recipientName) }]}>
              <Text style={styles.senderAvatarText}>{getInitials(item.senderName || recipientName)}</Text>
            </View>
          )}

          <View style={[styles.bubbleContainer, isMine ? styles.bubbleContainerMine : styles.bubbleContainerTheirs]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={() => {
                if (!item.pending) setSelectedMessageForAction(item);
              }}
              delayLongPress={280}
            >
              {/* Quoted Reply Banner above Message Bubble */}
              {item.replyTo && (
                <View
                  style={[
                    styles.quotedBubbleWrap,
                    {
                      backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9',
                      borderColor: theme === 'dark' ? '#334155' : '#cbd5e1',
                      borderLeftColor: colors.primaryLight,
                      alignSelf: isMine ? 'flex-end' : 'flex-start',
                    },
                  ]}
                >
                  <Text style={[styles.quotedSenderName, { color: colors.primaryLight }]}>
                    {item.replyTo.senderName || 'Responder'}
                  </Text>
                  <Text style={[styles.quotedPreviewText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.replyTo.type === 'image' ? '📷 Larawan' : (item.replyTo.text || '')}
                  </Text>
                </View>
              )}

              {/* Image Content */}
              {item.type === 'image' && item.imageUrl ? (
                <View
                  style={[
                    styles.imageBubble,
                    {
                      backgroundColor: isMine ? colors.primaryLight : (theme === 'dark' ? '#1e293b' : '#f1f5f9'),
                      borderColor: isMine ? 'transparent' : colors.cardBorder,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={[styles.chatImage, { opacity: item.pending ? 0.6 : 1 }]}
                    resizeMode="cover"
                  />
                  {item.pending && (
                    <View style={styles.imageOverlayPending}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.imageZoomBadge}
                    onPress={() => setFullscreenImage(item.imageUrl)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="expand-outline" size={13} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Text Content */
                <View
                  style={[
                    styles.textBubble,
                    isMine
                      ? [styles.textBubbleMine, { backgroundColor: colors.primaryLight }]
                      : [styles.textBubbleTheirs, { backgroundColor: theme === 'dark' ? '#1e293b' : '#f1f5f9', borderColor: colors.cardBorder }],
                    item.pending && { opacity: 0.7 },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isMine ? '#ffffff' : colors.text },
                    ]}
                  >
                    {item.text}
                  </Text>
                  {item.isEdited && (
                    <Text
                      style={[
                        styles.editedTag,
                        { color: isMine ? 'rgba(255,255,255,0.75)' : colors.textMuted },
                      ]}
                    >
                      (na-edit)
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* Reaction Pill */}
            {reactionSummary.length > 0 && (
              <View style={[styles.reactionPill, isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {reactionSummary.map(([em, cnt]) => (
                  <Text key={em} style={styles.reactionText}>
                    {em} {cnt > 1 ? cnt : ''}
                  </Text>
                ))}
              </View>
            )}

            {/* Timestamp & Status */}
            <View style={[styles.metaRow, isMine ? styles.metaRowMine : styles.metaRowTheirs]}>
              <Text style={[styles.metaTime, { color: colors.textMuted }]}>
                {formatMsgTime(item.createdAt)}
              </Text>
              {isMine && (
                item.pending ? (
                  <Ionicons name="time-outline" size={11} color={colors.textMuted} />
                ) : item.isSeen ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Ionicons name="checkmark-done" size={13} color="#0284c7" />
                    <Text style={{ fontSize: 9.5, fontWeight: '700', color: '#0284c7' }}>Seen</Text>
                  </View>
                ) : (
                  <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
                )
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const recipientInitialColor = avatarColor(recipientName || 'R');

  // Compute bottom padding: Clean 8px buffer on Android (handled natively), safe-area aware on iOS
  const bottomPadding = Platform.OS === 'ios'
    ? (isKeyboardOpen ? 8 : Math.max(insets.bottom, 8))
    : 8;

  // Check if selected message can be edited / unsent (only if authored by me AND NOT SEEN)
  const canEditOrUnsend = selectedMessageForAction
    ? selectedMessageForAction.senderId === myUserId && !selectedMessageForAction.isSeen
    : false;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Status Bar (Edge-to-Edge compatible) ── */}
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

      {/* ── Top Header ── */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        {/* Recipient Profile */}
        <View style={styles.headerProfile}>
          <View style={[styles.avatarWrap, { backgroundColor: recipientInitialColor }]}>
            <Text style={styles.avatarText}>{getInitials(recipientName || 'R')}</Text>
            <View style={[styles.onlineDot, { backgroundColor: isOffline ? '#f59e0b' : '#10b981' }]} />
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
              {recipientName || 'Responder'}
            </Text>
            <View style={styles.headerSubtitleRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.roleBadgeText, { color: colors.primaryLight }]} numberOfLines={1}>
                  {recipientRoleTitle || 'Responder'}
                </Text>
              </View>
              {recipientBarangay ? (
                <Text style={[styles.headerBarangay, { color: colors.textMuted }]} numberOfLines={1}>
                  • {recipientBarangay}
                </Text>
              ) : null}
              {isOffline && (
                <Text style={[styles.headerBarangay, { color: '#f59e0b', fontWeight: '700' }]}>
                  • Offline
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* ── Offline Banner ── */}
      <OfflineBanner />

      {/* ── Main Chat Area with Universal Keyboard Avoidance ── */}
      <KeyboardAvoidingView
        style={styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primaryLight} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {language === 'tl' ? 'Kinukuha ang mga mensahe...' : 'Loading messages...'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="chatbubbles-outline" size={36} color={colors.primaryLight} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'tl' ? 'Pribadong Usapan' : 'Direct Conversation'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {language === 'tl'
                    ? `Magsimulang magpadala ng mensahe kay ${recipientName || 'responder'}. Naka-encrypt at ligtas ang inyong pag-uusap.`
                    : `Send a direct real-time message to ${recipientName || 'responder'}.`}
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={{ width: '100%', alignItems: 'center' }}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.primaryLight} style={{ marginVertical: 12 }} />
                ) : messages.length > 0 && !hasMore ? (
                  <View style={[styles.conversationIntroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <View style={[styles.introIconCircle, { backgroundColor: colors.primaryBg }]}>
                      <Ionicons name="shield-checkmark" size={24} color={colors.primaryLight} />
                    </View>
                    <Text style={[styles.introTitle, { color: colors.text }]}>
                      {language === 'tl' ? 'Pribadong Usapan' : 'Direct Conversation'}
                    </Text>
                    <Text style={[styles.introSubtitle, { color: colors.textSecondary }]}>
                      {language === 'tl'
                        ? `Ito ang simula ng iyong pakikipag-usap kay ${recipientName || 'responder'}.`
                        : `This is the start of your direct conversation with ${recipientName || 'responder'}.`}
                    </Text>
                  </View>
                ) : null}
              </View>
            }
          />
        )}

        {/* Image Processing Banner */}
        {isProcessingImage && (
          <View style={[styles.processingBanner, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={[styles.processingText, { color: colors.primaryLight }]}>
              {language === 'tl' ? 'Kino-compress ang larawan (WebP)...' : 'Optimizing photo to WebP...'}
            </Text>
          </View>
        )}

        {/* Quoted Reply Banner above Composer */}
        {replyingTo && (
          <View style={[styles.replyBanner, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={[styles.replyBannerLeftBar, { backgroundColor: colors.primaryLight }]} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[styles.replyBannerSender, { color: colors.primaryLight }]}>
                {language === 'tl' ? 'Sumasagot kay' : 'Replying to'} {replyingTo.senderName}
              </Text>
              <Text style={[styles.replyBannerText, { color: colors.textSecondary }]} numberOfLines={1}>
                {replyingTo.type === 'image' ? '📷 Larawan' : (replyingTo.text || '')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>
              <Ionicons name="close-circle" size={19} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Editing Banner */}
        {editingMessage && (
          <View style={[styles.editingBanner, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <Ionicons name="pencil" size={14} color={colors.primaryLight} />
              <Text style={[styles.editingBannerText, { color: colors.text }]} numberOfLines={1}>
                {language === 'tl' ? 'Ine-edit ang mensahe...' : 'Editing message...'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelEditBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Modern Composer / Text Field Bar ── */}
        <View
          style={[
            styles.composerBar,
            {
              backgroundColor: colors.card,
              borderTopColor: (replyingTo || editingMessage) ? 'transparent' : colors.cardBorder,
              paddingBottom: bottomPadding,
            },
          ]}
        >
          {/* Image Attachment Button */}
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
            onPress={pickAndSendImage}
            disabled={isProcessingImage || isSending || !!editingMessage || isOffline}
            activeOpacity={0.7}
          >
            <Ionicons name="image-outline" size={21} color={editingMessage || isOffline ? colors.textMuted : colors.primaryLight} />
          </TouchableOpacity>

          {/* Multiline Text Input */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.bg, borderColor: editingMessage ? colors.primaryLight : colors.cardBorder }]}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  height: Math.min(Math.max(38, inputHeight), 110),
                },
              ]}
              placeholder={
                isOffline
                  ? (language === 'tl' ? 'Offline: Hindi makakapagpadala...' : 'Offline: Cannot send message...')
                  : editingMessage
                  ? (language === 'tl' ? 'I-edit ang mensahe...' : 'Edit message...')
                  : replyingTo
                  ? (language === 'tl' ? 'Sumulat ng sagot...' : 'Type a reply...')
                  : (language === 'tl' ? 'Mag-type ng mensahe...' : 'Type a message...')
              }
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              onContentSizeChange={e => {
                const h = e?.nativeEvent?.contentSize?.height || 38;
                setInputHeight(h);
              }}
              maxLength={1500}
              editable={!isOffline}
            />
          </View>

          {/* Send / Update Button */}
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: (inputText.trim() && !isSending && !isOffline) ? colors.primaryLight : (theme === 'dark' ? '#334155' : '#cbd5e1'),
              },
            ]}
            onPress={handleSendPress}
            disabled={!inputText.trim() || isSending || isOffline}
            activeOpacity={0.8}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : editingMessage ? (
              <Ionicons name="checkmark" size={20} color="#ffffff" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Message Action / Reaction Modal (Long Press) ── */}
      <Modal
        visible={!!selectedMessageForAction}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessageForAction(null)}
      >
        <Pressable
          style={styles.actionModalOverlay}
          onPress={() => setSelectedMessageForAction(null)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Top Quick Emoji Reactions */}
            <View style={styles.emojiRow}>
              {EMOJI_LIST.map(em => (
                <TouchableOpacity
                  key={em}
                  style={styles.emojiBtn}
                  onPress={() => handleReact(em)}
                  activeOpacity={0.7}
                  disabled={isOffline}
                >
                  <Text style={styles.emojiChar}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.actionDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Reply Option */}
            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => handleStartReply(selectedMessageForAction!)}
              disabled={isOffline}
            >
              <Ionicons name="arrow-undo-outline" size={19} color={colors.text} />
              <Text style={[styles.actionOptionText, { color: colors.text }]}>
                {language === 'tl' ? 'Sumagot / Mag-reply' : 'Reply to Message'}
              </Text>
            </TouchableOpacity>

            {/* Copy Text */}
            {selectedMessageForAction?.type === 'text' && (
              <TouchableOpacity
                style={styles.actionOption}
                onPress={() => handleCopyText(selectedMessageForAction?.text)}
              >
                <Ionicons name="copy-outline" size={19} color={colors.text} />
                <Text style={[styles.actionOptionText, { color: colors.text }]}>
                  {language === 'tl' ? 'Kopyahin ang Teksto' : 'Copy Text'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Edit (if my message and NOT seen) */}
            {selectedMessageForAction?.type === 'text' && selectedMessageForAction?.senderId === myUserId && (
              canEditOrUnsend ? (
                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => handleStartEdit(selectedMessageForAction)}
                  disabled={isOffline}
                >
                  <Ionicons name="pencil-outline" size={19} color={colors.primaryLight} />
                  <Text style={[styles.actionOptionText, { color: colors.primaryLight }]}>
                    {language === 'tl' ? 'I-edit ang Mensahe' : 'Edit Message'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.disabledActionNotice}>
                  <Ionicons name="eye-outline" size={15} color={colors.textMuted} />
                  <Text style={[styles.disabledActionText, { color: colors.textMuted }]}>
                    {language === 'tl' ? 'Nabasa na (hindi na ma-edit)' : 'Seen by recipient (cannot edit)'}
                  </Text>
                </View>
              )
            )}

            {/* Unsend (if my message and NOT seen) */}
            {selectedMessageForAction?.senderId === myUserId && (
              canEditOrUnsend ? (
                <TouchableOpacity
                  style={styles.actionOption}
                  onPress={() => handleUnsend(selectedMessageForAction)}
                  disabled={isOffline}
                >
                  <Ionicons name="trash-outline" size={19} color="#ef4444" />
                  <Text style={[styles.actionOptionText, { color: '#ef4444' }]}>
                    {language === 'tl' ? 'Bawiin / I-unsend ang Mensahe' : 'Unsend Message'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.disabledActionNotice}>
                  <Ionicons name="checkmark-done" size={15} color={colors.textMuted} />
                  <Text style={[styles.disabledActionText, { color: colors.textMuted }]}>
                    {language === 'tl' ? 'Nabasa na (hindi na ma-unsend)' : 'Seen by recipient (cannot unsend)'}
                  </Text>
                </View>
              )
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Fullscreen Image Preview Modal ── */}
      <Modal visible={!!fullscreenImage} transparent animationType="fade">
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.closeFullscreenBtn}
            onPress={() => setFullscreenImage(null)}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: {
    padding: 6,
    borderRadius: 12,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  headerBarangay: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },

  // Main container
  mainContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Date Header
  dateHeaderWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Message Rows
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowTheirs: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  senderAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  bubbleContainer: {
    maxWidth: width * 0.74,
  },
  bubbleContainerMine: {
    alignItems: 'flex-end',
  },
  bubbleContainerTheirs: {
    alignItems: 'flex-start',
  },

  // Quoted Reply Bubble
  quotedBubbleWrap: {
    borderLeftWidth: 3.5,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 4,
    maxWidth: '96%',
    gap: 1.5,
  },
  quotedSenderName: {
    fontSize: 11,
    fontWeight: '800',
  },
  quotedPreviewText: {
    fontSize: 11.5,
    fontWeight: '500',
  },

  // Text Bubbles
  textBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textBubbleMine: {
    borderBottomRightRadius: 4,
    borderColor: 'transparent',
  },
  textBubbleTheirs: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  editedTag: {
    fontSize: 10.5,
    fontStyle: 'italic',
    marginTop: 2,
    alignSelf: 'flex-end',
  },

  // Image Bubbles
  imageBubble: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  chatImage: {
    width: width * 0.65,
    height: 190,
    borderRadius: 15,
  },
  imageOverlayPending: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageZoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 5,
  },

  // Reaction Pill
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: -8,
    zIndex: 5,
  },
  reactionText: {
    fontSize: 12,
  },

  // Meta & Status
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  metaRowMine: {
    justifyContent: 'flex-end',
  },
  metaRowTheirs: {
    justifyContent: 'flex-start',
  },
  metaTime: {
    fontSize: 10.5,
    fontWeight: '500',
  },

  // Empty State
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  // Conversation Intro Card at Top of Thread
  conversationIntroCard: {
    width: '92%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  introIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  introSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // Processing, Reply & Editing Banners
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderTopWidth: 1,
    gap: 8,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 10,
  },
  replyBannerLeftBar: {
    width: 3.5,
    height: '100%',
    borderRadius: 2,
  },
  replyBannerSender: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  replyBannerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelReplyBtn: {
    padding: 3,
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopWidth: 1,
  },
  editingBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelEditBtn: {
    padding: 2,
  },

  // Composer Bar
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 2,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 14.5,
    lineHeight: 20,
    textAlignVertical: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Action Modal
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 32,
  },
  actionSheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
  },
  emojiBtn: {
    padding: 6,
    borderRadius: 12,
  },
  emojiChar: {
    fontSize: 26,
  },
  actionDivider: {
    height: 1,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    gap: 12,
    borderRadius: 12,
  },
  actionOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  disabledActionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  disabledActionText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // Fullscreen Modal
  fullscreenModal: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '85%',
  },
});

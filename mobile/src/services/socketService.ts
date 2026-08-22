import { io } from "socket.io-client";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000/api/v1";
const SOCKET_URL = API_BASE.replace(/\/api\/v1\/?$/, "");

class SocketService {
  private socket: any = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private currentUserId: string | null = null;

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.socket && this.socket.connected) return;

    try {
      this.socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on("connect", () => {
        console.log(`[SocketService] Connected to real-time server: ${SOCKET_URL}`);
        // Auto-rejoin personal room on connect/reconnect
        if (this.currentUserId) {
          this.socket.emit("join_room", this.currentUserId);
          console.log(`[SocketService] Rejoined personal room: ${this.currentUserId}`);
        }
      });

      this.socket.on("disconnect", (reason: any) => {
        console.log(`[SocketService] Disconnected: ${reason}`);
      });

      this.socket.on("connect_error", (err: any) => {
        console.warn(`[SocketService] Connection warning:`, err?.message);
      });

      // Re-attach any registered event listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb);
        });
      });
    } catch (err) {
      console.warn("[SocketService] Init error:", err);
    }
  }

  /** Subscribe to a server-emitted event. Returns an unsubscribe function. */
  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: (data: any) => void) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /** Emit an event to the server */
  public emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("[SocketService] Cannot emit immediately — socket not connected");
      // Try connecting
      this.connect();
    }
  }

  /**
   * Join the personal room for this user so the backend can
   * send targeted events (e.g. chat:new_message) to this device.
   */
  public joinUserRoom(userId: string) {
    if (!userId) return;
    this.currentUserId = userId;
    this.emit("join_room", userId);
    console.log(`[SocketService] Joined personal room for user: ${userId}`);
  }

  public leaveUserRoom(userId: string) {
    if (!userId) return;
    if (this.currentUserId === userId) this.currentUserId = null;
    this.emit("leave_room", userId);
  }
}

export const RealtimeSocket = new SocketService();

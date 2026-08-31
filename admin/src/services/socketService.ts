import { io, Socket } from 'socket.io-client';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://irosin-dss-api.onrender.com';
const SOCKET_URL = API_BASE.replace(/\/api\/v1\/?$/, '');

class AdminSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.connect();
  }

  public connect() {
    if (this.socket && this.socket.connected) return;

    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log(`[AdminSocket] Connected to real-time server: ${SOCKET_URL}`);
      });

      this.socket.on('disconnect', (reason) => {
        console.log(`[AdminSocket] Disconnected: ${reason}`);
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`[AdminSocket] Connection error:`, err?.message);
      });

      // Re-attach listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((cb) => {
          this.socket?.on(event, cb);
        });
      });
    } catch (err) {
      console.warn('[AdminSocket] Init error:', err);
    }
  }

  public on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    };
  }

  public isConnected(): boolean {
    return !!this.socket?.connected;
  }
}

export const AdminSocket = new AdminSocketService();

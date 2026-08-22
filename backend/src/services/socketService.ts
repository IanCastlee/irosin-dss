import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: http.Server): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Connected: ${socket.id}`);

    // Client joins their personal room for targeted messaging
    socket.on('join_room', (userId: string) => {
      if (userId && typeof userId === 'string') {
        socket.join(`user_${userId}`);
        console.log(`[WebSocket] User ${userId} joined personal room`);
      }
    });

    socket.on('leave_room', (userId: string) => {
      if (userId && typeof userId === 'string') {
        socket.leave(`user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

/** Broadcast an event to ALL connected clients */
export const emitRealtimeEvent = (event: string, data?: any) => {
  if (io) {
    try {
      io.emit(event, data);
      console.log(`[WebSocket] Broadcasted event '${event}' to all connected clients.`);
    } catch (err) {
      console.warn(`[WebSocket] Failed to emit event '${event}':`, err);
    }
  }
};

/** Emit an event to a SPECIFIC user's personal room */
export const emitToUser = (userId: string, event: string, data?: any) => {
  if (io) {
    try {
      io.to(`user_${userId}`).emit(event, data);
      console.log(`[WebSocket] Emitted '${event}' to user ${userId}`);
    } catch (err) {
      console.warn(`[WebSocket] Failed to emit to user ${userId}:`, err);
    }
  }
};

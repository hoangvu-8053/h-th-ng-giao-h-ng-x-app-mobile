import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = 'http://10.0.2.2:3000';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('token');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// ── Shipper helpers ───────────────────────────────────────────────────────────

export function shipperGoOnline(lat: number, lng: number, vehicleType?: string) {
  socket?.emit('shipper:go_online', { lat, lng, vehicleType });
}

export function shipperGoOffline() {
  socket?.emit('shipper:go_offline');
}

export function updateShipperLocation(lat: number, lng: number) {
  socket?.emit('shipper:update_location', { lat, lng });
}

export function acceptOrder(orderId: string) {
  socket?.emit('shipper:accept_order', { orderId });
}

export function rejectOrder(orderId: string) {
  socket?.emit('shipper:reject_order', { orderId });
}

export function updateOrderStatus(orderId: string, status: string) {
  socket?.emit('shipper:update_order_status', { orderId, status });
}

// ── Customer helpers ──────────────────────────────────────────────────────────

export function watchOrder(orderId: string) {
  socket?.emit('customer:watch_order', { orderId });
}

export function stopWatchingOrder(orderId: string) {
  socket?.emit('customer:stop_watching', { orderId });
}

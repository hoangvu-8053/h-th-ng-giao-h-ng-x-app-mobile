import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://10.0.2.2:3000/api'; // Android emulator → localhost
// Thay bằng IP thực khi test trên thiết bị: 'http://192.168.x.x:3000/api'

const api = axios.create({ baseURL: BASE_URL });

// Tự động gắn token vào mọi request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (data: {
  name: string; phone: string; password: string;
  role: 'customer' | 'shipper'; vehicleType?: string;
}) => api.post('/auth/register', data);

export const login = (phone: string, password: string) =>
  api.post('/auth/login', { phone, password });

// Orders
export const createOrder = (data: {
  pickupAddress: string; pickupLocation: { lat: number; lng: number };
  deliveryAddress: string; deliveryLocation: { lat: number; lng: number };
  packageDescription?: string; estimatedWeight?: number; fee: number;
}) => api.post('/orders', data);

export const getMyOrders = () => api.get('/orders/my');

export const getOrderDetail = (orderId: string) => api.get(`/orders/${orderId}`);

export const cancelOrder = (orderId: string, reason?: string) =>
  api.patch(`/orders/${orderId}/cancel`, { reason });

// Shippers
export const getNearbyShippers = (lat: number, lng: number, radius = 10) =>
  api.get('/shippers/nearby', { params: { lat, lng, radius } });

export default api;

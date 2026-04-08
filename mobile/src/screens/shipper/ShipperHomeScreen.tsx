import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Switch, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  requestLocationPermission, getCurrentPosition, watchPosition, clearWatch,
} from '../../services/location';
import {
  shipperGoOnline, shipperGoOffline, updateShipperLocation,
  acceptOrder, rejectOrder, getSocket,
} from '../../services/socket';
import { useAuthStore } from '../../store/useAuthStore';
import { connectSocket } from '../../services/socket';
import { listenForegroundNotifications, getInitialNotification } from '../../services/notification';
import messaging from '@react-native-firebase/messaging';

interface IncomingOrder {
  orderId: string;
  pickupAddress: string;
  deliveryAddress: string;
  packageDescription: string;
  fee: number;
  distance: string;
  customerName: string;
}

export default function ShipperHomeScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    initSocket();
    initLocation();
    initNotifications();
    return () => {
      if (watchIdRef.current !== null) clearWatch(watchIdRef.current);
    };
  }, []);

  async function initSocket() {
    await connectSocket();
    const socket = getSocket();

    socket?.on('new_order_request', (data: IncomingOrder) => {
      setIncomingOrder(data);
    });

    socket?.on('shipper:order_confirmed', ({ orderId }) => {
      setCurrentOrderId(orderId);
      navigation.navigate('ActiveDelivery', { orderId });
    });

    socket?.on('order:already_taken', () => {
      Alert.alert('Thông báo', 'Đơn hàng này đã được shipper khác nhận.');
      setIncomingOrder(null);
    });

    socket?.on('order_cancelled', () => {
      Alert.alert('Thông báo', 'Khách hàng đã hủy đơn hàng.');
      setIncomingOrder(null);
    });
  }

  function handleOrderFromNotification(data: Record<string, string>) {
    setIncomingOrder({
      orderId: data.orderId,
      pickupAddress: data.pickupAddress,
      deliveryAddress: data.deliveryAddress,
      packageDescription: data.packageDescription || '',
      fee: Number(data.fee),
      distance: data.distance,
      customerName: data.customerName,
    });
  }

  async function initNotifications() {
    // App bị tắt hoàn toàn → user tap notification
    const initial = await getInitialNotification();
    if (initial) handleOrderFromNotification(initial);

    // App ở background → user tap notification
    messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage.data?.type === 'new_order') {
        handleOrderFromNotification(remoteMessage.data as Record<string, string>);
      }
    });

    // App ở foreground → hiện modal trực tiếp
    listenForegroundNotifications(handleOrderFromNotification);
  }

  async function initLocation() {
    const ok = await requestLocationPermission();
    if (!ok) return;
    try {
      const pos = await getCurrentPosition();
      setMyLocation(pos);
    } catch {}
  }

  async function toggleOnline(value: boolean) {
    if (value) {
      if (!myLocation) {
        Alert.alert('Lỗi', 'Chưa lấy được vị trí. Vui lòng thử lại.');
        return;
      }
      shipperGoOnline(myLocation.lat, myLocation.lng);
      // Bắt đầu watch và gửi vị trí liên tục
      watchIdRef.current = watchPosition((pos) => {
        setMyLocation(pos);
        updateShipperLocation(pos.lat, pos.lng);
      });
    } else {
      shipperGoOffline();
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    setIsOnline(value);
  }

  function handleAcceptOrder() {
    if (!incomingOrder) return;
    acceptOrder(incomingOrder.orderId);
    setIncomingOrder(null);
  }

  function handleRejectOrder() {
    if (!incomingOrder) return;
    rejectOrder(incomingOrder.orderId);
    setIncomingOrder(null);
  }

  return (
    <View style={styles.container}>
      {/* Bản đồ */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation={isOnline}
        initialRegion={
          myLocation
            ? { latitude: myLocation.lat, longitude: myLocation.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
            : { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      />

      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>Tài xế giao hàng</Text>
        </View>
        <View style={styles.toggleWrapper}>
          <Text style={[styles.statusLabel, { color: isOnline ? '#4CAF50' : '#999' }]}>
            {isOnline ? '● Đang online' : '○ Offline'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineHint}>
          <Text style={styles.offlineText}>
            Bật Online để bắt đầu nhận đơn hàng
          </Text>
        </View>
      )}

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <Text style={styles.historyBtnText}>📋 Lịch sử giao hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Modal nhận đơn hàng mới */}
      <Modal visible={!!incomingOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📦 Đơn hàng mới!</Text>
            <Text style={styles.modalCustomer}>Khách: {incomingOrder?.customerName}</Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>📍 Lấy hàng</Text>
              <Text style={styles.modalValue}>{incomingOrder?.pickupAddress}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>🏠 Giao đến</Text>
              <Text style={styles.modalValue}>{incomingOrder?.deliveryAddress}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>📏 Khoảng cách</Text>
              <Text style={styles.modalValue}>{incomingOrder?.distance} km</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>💰 Phí ship</Text>
              <Text style={[styles.modalValue, styles.feeText]}>
                {incomingOrder?.fee.toLocaleString('vi-VN')} đ
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleRejectOrder}>
                <Text style={styles.rejectBtnText}>Từ chối</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptOrder}>
                <Text style={styles.acceptBtnText}>Nhận đơn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statusBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 48, elevation: 4, shadowOpacity: 0.1,
  },
  userInfo: {},
  userName: { fontSize: 16, fontWeight: '700' },
  userRole: { fontSize: 12, color: '#666' },
  toggleWrapper: { alignItems: 'flex-end' },
  statusLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  offlineHint: {
    position: 'absolute', top: '45%', left: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 16, alignItems: 'center',
  },
  offlineText: { color: '#fff', fontSize: 15 },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    flexDirection: 'row', gap: 12,
  },
  historyBtn: {
    flex: 1, backgroundColor: '#FFF3E8', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  historyBtnText: { color: '#FF6B00', fontWeight: '600' },
  logoutBtn: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  logoutText: { color: '#666', fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  modalCustomer: { color: '#666', marginBottom: 16 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalLabel: { color: '#999', fontSize: 14 },
  modalValue: { color: '#333', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  feeText: { color: '#FF6B00', fontWeight: '700', fontSize: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  rejectBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ddd',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  rejectBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  acceptBtn: {
    flex: 1, backgroundColor: '#FF6B00',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

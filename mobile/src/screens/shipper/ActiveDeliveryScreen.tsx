import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { updateOrderStatus, getSocket } from '../../services/socket';
import { getOrderDetail } from '../../services/api';

type DeliveryStatus = 'accepted' | 'picking_up' | 'delivering' | 'delivered';

const NEXT_STATUS: Record<string, { next: DeliveryStatus; label: string; color: string }> = {
  accepted: { next: 'picking_up', label: '🛵 Bắt đầu đi lấy hàng', color: '#9C27B0' },
  picking_up: { next: 'delivering', label: '📦 Đã lấy hàng, bắt đầu giao', color: '#2196F3' },
  delivering: { next: 'delivered', label: '✅ Xác nhận đã giao hàng', color: '#4CAF50' },
};

export default function ActiveDeliveryScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState<DeliveryStatus>('accepted');

  useEffect(() => {
    loadOrder();
    const socket = getSocket();

    socket?.on('order_cancelled', ({ orderId: id }) => {
      if (id === orderId) {
        Alert.alert('Thông báo', 'Khách hàng đã hủy đơn hàng này.');
        navigation.replace('ShipperHome');
      }
    });

    return () => socket?.off('order_cancelled');
  }, [orderId]);

  async function loadOrder() {
    try {
      const res = await getOrderDetail(orderId);
      setOrder(res.data);
      setStatus(res.data.status);
    } catch {}
  }

  function handleNextStep() {
    const next = NEXT_STATUS[status];
    if (!next) return;

    Alert.alert(
      'Xác nhận',
      next.label,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            updateOrderStatus(orderId, next.next);
            setStatus(next.next);
            if (next.next === 'delivered') {
              setTimeout(() => {
                Alert.alert('Hoàn thành!', 'Giao hàng thành công. Cảm ơn bạn!');
                navigation.replace('ShipperHome');
              }, 500);
            }
          },
        },
      ]
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  const nextStep = NEXT_STATUS[status];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        followsUserLocation
        initialRegion={{
          latitude: order.pickupLocation.lat,
          longitude: order.pickupLocation.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={{ latitude: order.pickupLocation.lat, longitude: order.pickupLocation.lng }}
          title="Lấy hàng"
          pinColor="#FF6B00"
        />
        <Marker
          coordinate={{ latitude: order.deliveryLocation.lat, longitude: order.deliveryLocation.lng }}
          title="Giao hàng"
          pinColor="#4CAF50"
        />
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Đang giao đơn hàng</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>📍 Lấy hàng</Text>
          <Text style={styles.infoValue}>{order.pickupAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🏠 Giao đến</Text>
          <Text style={styles.infoValue}>{order.deliveryAddress}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>👤 Khách hàng</Text>
          <Text style={styles.infoValue}>{order.customer?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>💰 Phí ship</Text>
          <Text style={[styles.infoValue, { color: '#FF6B00', fontWeight: '700' }]}>
            {order.fee?.toLocaleString('vi-VN')} đ
          </Text>
        </View>

        {nextStep && status !== 'delivered' && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: nextStep.color }]}
            onPress={handleNextStep}
          >
            <Text style={styles.actionBtnText}>{nextStep.label}</Text>
          </TouchableOpacity>
        )}

        {status === 'delivered' && (
          <View style={styles.doneBox}>
            <Text style={styles.doneText}>🎉 Giao hàng thành công!</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  panel: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40,
  },
  panelTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  infoLabel: { color: '#999', fontSize: 14, width: 100 },
  infoValue: { color: '#333', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  actionBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16,
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBox: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16,
  },
  doneText: { color: '#4CAF50', fontSize: 16, fontWeight: '700' },
});

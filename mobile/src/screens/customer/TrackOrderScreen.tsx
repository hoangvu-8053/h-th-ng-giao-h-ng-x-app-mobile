import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useOrderStore } from '../../store/useOrderStore';
import { cancelOrder, getOrderDetail } from '../../services/api';
import { getSocket, stopWatchingOrder, watchOrder } from '../../services/socket';

const STATUS_LABELS: Record<string, string> = {
  searching: '🔍 Đang tìm shipper...',
  accepted: '✅ Shipper đã nhận đơn',
  picking_up: '📦 Shipper đang đến lấy hàng',
  delivering: '🚚 Đang giao hàng',
  delivered: '🎉 Đã giao hàng thành công!',
  cancelled: '❌ Đơn hàng đã bị hủy',
};

const STATUS_COLOR: Record<string, string> = {
  searching: '#FF6B00',
  accepted: '#2196F3',
  picking_up: '#9C27B0',
  delivering: '#009688',
  delivered: '#4CAF50',
  cancelled: '#F44336',
};

export default function TrackOrderScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const mapRef = useRef<MapView>(null);

  const activeOrder = useOrderStore((s) => s.activeOrder);
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);
  const updateShipperLocation = useOrderStore((s) => s.updateShipperLocation);
  const setActiveOrder = useOrderStore((s) => s.setActiveOrder);

  useEffect(() => {
    loadOrder();
    const socket = getSocket();
    watchOrder(orderId);

    socket?.on('order:status_updated', ({ orderId: id, status }) => {
      if (id === orderId) updateOrderStatus(id, status);
      if (status === 'delivered') {
        setTimeout(() => {
          navigation.replace('CustomerHome');
          setActiveOrder(null);
        }, 3000);
      }
    });

    socket?.on('shipper:location_update', ({ orderId: id, lat, lng }) => {
      if (id === orderId) updateShipperLocation(id, lat, lng);
    });

    socket?.on('shipper:disconnected', ({ orderId: id }) => {
      if (id === orderId) {
        Alert.alert('Cảnh báo', 'Shipper bị mất kết nối. Đơn hàng sẽ được tái phân công.');
      }
    });

    return () => {
      stopWatchingOrder(orderId);
      socket?.off('order:status_updated');
      socket?.off('shipper:location_update');
      socket?.off('shipper:disconnected');
    };
  }, [orderId]);

  async function loadOrder() {
    try {
      const res = await getOrderDetail(orderId);
      setActiveOrder(res.data);
    } catch {}
  }

  async function handleCancel() {
    Alert.alert('Xác nhận hủy', 'Bạn có chắc muốn hủy đơn hàng này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy đơn', style: 'destructive',
        onPress: async () => {
          try {
            await cancelOrder(orderId);
            updateOrderStatus(orderId, 'cancelled');
            setTimeout(() => navigation.replace('CustomerHome'), 1500);
          } catch (err: any) {
            Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy đơn');
          }
        },
      },
    ]);
  }

  if (!activeOrder) {
    return (
      <View style={styles.center}>
        <Text>Đang tải thông tin đơn hàng...</Text>
      </View>
    );
  }

  const status = activeOrder.status;
  const shipperPos = activeOrder.shipperLocation;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={{
          latitude: activeOrder.pickupLocation.lat,
          longitude: activeOrder.pickupLocation.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {/* Điểm lấy hàng */}
        <Marker
          coordinate={{ latitude: activeOrder.pickupLocation.lat, longitude: activeOrder.pickupLocation.lng }}
          title="Lấy hàng"
          pinColor="#FF6B00"
        />
        {/* Điểm giao hàng */}
        <Marker
          coordinate={{ latitude: activeOrder.deliveryLocation.lat, longitude: activeOrder.deliveryLocation.lng }}
          title="Giao hàng"
          pinColor="#4CAF50"
        />
        {/* Vị trí shipper realtime */}
        {shipperPos && (
          <Marker
            coordinate={{ latitude: shipperPos.lat, longitude: shipperPos.lng }}
            title={`🛵 ${activeOrder.shipper?.name}`}
          />
        )}
      </MapView>

      {/* Bottom info panel */}
      <View style={styles.panel}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>
            {STATUS_LABELS[status]}
          </Text>
        </View>

        {activeOrder.shipper && (
          <View style={styles.shipperInfo}>
            <Text style={styles.shipperName}>🛵 {activeOrder.shipper.name}</Text>
            <Text style={styles.shipperDetail}>⭐ {activeOrder.shipper.rating} · {activeOrder.shipper.vehicleType}</Text>
          </View>
        )}

        <View style={styles.addresses}>
          <Text style={styles.addressLabel}>📦 Lấy hàng</Text>
          <Text style={styles.addressValue}>{activeOrder.pickupAddress}</Text>
          <Text style={[styles.addressLabel, { marginTop: 8 }]}>🏠 Giao hàng</Text>
          <Text style={styles.addressValue}>{activeOrder.deliveryAddress}</Text>
        </View>

        {['searching', 'accepted'].includes(status) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Hủy đơn hàng</Text>
          </TouchableOpacity>
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
    padding: 20, paddingBottom: 32,
  },
  statusBadge: {
    borderRadius: 20, padding: 10, alignItems: 'center', marginBottom: 12,
  },
  statusText: { fontWeight: '700', fontSize: 15 },
  shipperInfo: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 12,
  },
  shipperName: { fontSize: 15, fontWeight: '600' },
  shipperDetail: { color: '#666', fontSize: 14 },
  addresses: { marginBottom: 12 },
  addressLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
  addressValue: { fontSize: 14, color: '#333', marginTop: 2 },
  cancelBtn: {
    borderWidth: 1, borderColor: '#F44336', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#F44336', fontWeight: '600', fontSize: 15 },
});

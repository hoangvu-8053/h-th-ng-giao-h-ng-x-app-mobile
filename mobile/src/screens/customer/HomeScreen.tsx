import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { requestLocationPermission, getCurrentPosition } from '../../services/location';
import { getNearbyShippers } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

interface NearbyShipper {
  shipperId: string;
  name: string;
  vehicleType: string;
  rating: number;
  lat: number;
  lng: number;
  distance: string;
}

const VEHICLE_ICON: Record<string, string> = {
  motorbike: '🛵',
  bicycle: '🚴',
  car: '🚗',
};

export default function CustomerHomeScreen({ navigation }: any) {
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shippers, setShippers] = useState<NearbyShipper[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    initLocation();
  }, []);

  async function initLocation() {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert('Cần quyền vị trí', 'Vui lòng cấp quyền vị trí để sử dụng ứng dụng.');
      return;
    }
    try {
      const pos = await getCurrentPosition();
      setMyLocation(pos);
      loadNearbyShippers(pos.lat, pos.lng);
    } catch {
      Alert.alert('Lỗi', 'Không thể lấy vị trí. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  async function loadNearbyShippers(lat: number, lng: number) {
    try {
      const res = await getNearbyShippers(lat, lng);
      setShippers(res.data);
    } catch {
      // Bỏ qua nếu không load được
    }
  }

  function handleRefresh() {
    if (!myLocation) return;
    setLoading(true);
    loadNearbyShippers(myLocation.lat, myLocation.lng).finally(() => setLoading(false));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Đang lấy vị trí...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Bản đồ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={
          myLocation
            ? { latitude: myLocation.lat, longitude: myLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }
            : { latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.05, longitudeDelta: 0.05 }
        }
      >
        {/* Marker các shipper đang free */}
        {shippers.map((s) => (
          <Marker
            key={s.shipperId}
            coordinate={{ latitude: s.lat, longitude: s.lng }}
            title={`${VEHICLE_ICON[s.vehicleType]} ${s.name}`}
            description={`${s.distance} km | ⭐ ${s.rating}`}
          />
        ))}
      </MapView>

      {/* Nút đặt đơn */}
      <View style={styles.bottomSheet}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Xin chào, {user?.name} 👋</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={styles.refresh}>🔄 Làm mới</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          {shippers.length > 0
            ? `${shippers.length} shipper đang sẵn sàng gần bạn`
            : 'Không có shipper nào gần đây'}
        </Text>

        {/* Danh sách shipper gần nhất */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shipperList}>
          {shippers.slice(0, 5).map((s) => (
            <View key={s.shipperId} style={styles.shipperCard}>
              <Text style={styles.shipperIcon}>{VEHICLE_ICON[s.vehicleType]}</Text>
              <Text style={styles.shipperName}>{s.name}</Text>
              <Text style={styles.shipperDist}>{s.distance} km</Text>
              <Text style={styles.shipperRating}>⭐ {s.rating}</Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.orderBtn, !myLocation && styles.orderBtnDisabled]}
          disabled={!myLocation}
          onPress={() => navigation.navigate('CreateOrder', { myLocation })}
        >
          <Text style={styles.orderBtnText}>📦  Đặt đơn hàng</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('OrderHistory')}
        >
          <Text style={styles.historyBtnText}>Lịch sử đơn hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  bottomSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 10, elevation: 10,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  greeting: { fontSize: 18, fontWeight: '700' },
  refresh: { color: '#FF6B00', fontSize: 14 },
  sectionTitle: { color: '#666', fontSize: 14, marginBottom: 12 },
  shipperList: { marginBottom: 16 },
  shipperCard: {
    backgroundColor: '#FFF3E8', borderRadius: 12, padding: 12,
    marginRight: 10, alignItems: 'center', minWidth: 90,
  },
  shipperIcon: { fontSize: 24 },
  shipperName: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  shipperDist: { fontSize: 11, color: '#666' },
  shipperRating: { fontSize: 11, color: '#FF6B00' },
  orderBtn: {
    backgroundColor: '#FF6B00', borderRadius: 14,
    padding: 16, alignItems: 'center', marginBottom: 10,
  },
  orderBtnDisabled: { opacity: 0.5 },
  orderBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  historyBtn: { alignItems: 'center', padding: 8 },
  historyBtnText: { color: '#666', fontSize: 14 },
});

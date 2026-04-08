import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { createOrder } from '../../services/api';
import { useOrderStore } from '../../store/useOrderStore';
import { watchOrder, getSocket } from '../../services/socket';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateFee(distanceKm: number): number {
  return Math.round(15000 + distanceKm * 5000);
}

export default function CreateOrderScreen({ route, navigation }: any) {
  const { myLocation } = route.params;

  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [weight, setWeight] = useState('1');
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [tempPin, setTempPin] = useState<{ lat: number; lng: number } | null>(null);

  const setActiveOrder = useOrderStore((s) => s.setActiveOrder);

  const distanceKm = deliveryLocation
    ? haversineKm(myLocation.lat, myLocation.lng, deliveryLocation.lat, deliveryLocation.lng)
    : 0;
  const fee = calculateFee(distanceKm);

  function openMapPicker() {
    setTempPin(deliveryLocation ?? {
      lat: myLocation.lat + 0.005,
      lng: myLocation.lng + 0.005,
    });
    setShowMapPicker(true);
  }

  function confirmPin() {
    if (tempPin) setDeliveryLocation(tempPin);
    setShowMapPicker(false);
  }

  async function handleSubmit() {
    if (!pickupAddress || !deliveryAddress) {
      return Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ lấy hàng và giao hàng');
    }
    if (!deliveryLocation) {
      return Alert.alert('Lỗi', 'Vui lòng chọn điểm giao hàng trên bản đồ');
    }

    setLoading(true);
    try {
      const res = await createOrder({
        pickupAddress,
        pickupLocation: myLocation,
        deliveryAddress,
        deliveryLocation,
        packageDescription: packageDesc,
        estimatedWeight: parseFloat(weight) || 1,
        fee,
      });

      const order = res.data.order;
      setActiveOrder(order);

      watchOrder(order._id);
      const socket = getSocket();

      socket?.on('order:accepted', (data) => {
        useOrderStore.getState().setActiveOrder({
          ...useOrderStore.getState().activeOrder!,
          status: 'accepted',
          shipper: data.shipper,
        });
        navigation.replace('TrackOrder', { orderId: order._id });
      });

      socket?.on('order:no_shipper_found', () => {
        Alert.alert('Thông báo', 'Không tìm thấy shipper. Vui lòng thử lại sau.');
        setLoading(false);
      });

      if (res.data.nearestCount === 0) {
        Alert.alert('Thông báo', 'Không có shipper nào gần đây. Đơn đang chờ...');
        setLoading(false);
        navigation.replace('TrackOrder', { orderId: order._id });
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể tạo đơn hàng');
      setLoading(false);
    }
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tạo đơn hàng</Text>

        <Text style={styles.label}>Địa chỉ lấy hàng</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập địa chỉ lấy hàng..."
          value={pickupAddress}
          onChangeText={setPickupAddress}
          multiline
        />

        <Text style={styles.label}>Địa chỉ giao hàng</Text>
        <TextInput
          style={styles.input}
          placeholder="Nhập địa chỉ giao hàng..."
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
        />

        <Text style={styles.label}>Chọn điểm giao trên bản đồ</Text>
        <TouchableOpacity style={styles.mapBtn} onPress={openMapPicker}>
          {deliveryLocation ? (
            <Text style={styles.mapBtnTextSet}>
              📍 {deliveryLocation.lat.toFixed(5)}, {deliveryLocation.lng.toFixed(5)}
              {'  '}({distanceKm.toFixed(1)} km)
            </Text>
          ) : (
            <Text style={styles.mapBtnText}>🗺️  Nhấn để chọn điểm giao</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Mô tả hàng hóa (không bắt buộc)</Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Quần áo, thực phẩm, tài liệu..."
          value={packageDesc}
          onChangeText={setPackageDesc}
        />

        <Text style={styles.label}>Khối lượng ước tính (kg)</Text>
        <TextInput
          style={[styles.input, { width: 100 }]}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        <View style={styles.feeBox}>
          <Text style={styles.feeLabel}>Phí vận chuyển ước tính</Text>
          <Text style={styles.feeValue}>{fee.toLocaleString('vi-VN')} đ</Text>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <View style={{ alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              <Text style={[styles.btnText, { marginTop: 6, fontSize: 13 }]}>
                Đang tìm shipper...
              </Text>
            </View>
          ) : (
            <Text style={styles.btnText}>Xác nhận & Tìm shipper</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Map picker modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: tempPin?.lat ?? myLocation.lat,
              longitude: tempPin?.lng ?? myLocation.lng,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            onPress={(e) => setTempPin({
              lat: e.nativeEvent.coordinate.latitude,
              lng: e.nativeEvent.coordinate.longitude,
            })}
          >
            {/* Điểm lấy hàng (cố định) */}
            <Marker
              coordinate={{ latitude: myLocation.lat, longitude: myLocation.lng }}
              title="Lấy hàng"
              pinColor="green"
            />
            {/* Điểm giao hàng (kéo thả) */}
            {tempPin && (
              <Marker
                coordinate={{ latitude: tempPin.lat, longitude: tempPin.lng }}
                title="Giao hàng"
                pinColor="red"
                draggable
                onDragEnd={(e) => setTempPin({
                  lat: e.nativeEvent.coordinate.latitude,
                  lng: e.nativeEvent.coordinate.longitude,
                })}
              />
            )}
          </MapView>

          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>Nhấn bản đồ hoặc kéo ghim đỏ để chọn điểm giao</Text>
          </View>

          <View style={styles.mapActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMapPicker(false)}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmPin}>
              <Text style={styles.confirmBtnText}>Xác nhận</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, marginBottom: 16, fontSize: 15,
  },
  mapBtn: {
    borderWidth: 1, borderColor: '#FF6B00', borderRadius: 12,
    padding: 14, marginBottom: 16, backgroundColor: '#FFF3E8',
  },
  mapBtnText: { color: '#FF6B00', fontSize: 15, textAlign: 'center' },
  mapBtnTextSet: { color: '#333', fontSize: 14, textAlign: 'center' },
  feeBox: {
    backgroundColor: '#FFF3E8', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  feeLabel: { color: '#666', fontSize: 14 },
  feeValue: { color: '#FF6B00', fontSize: 20, fontWeight: '700' },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  mapHint: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 10,
  },
  mapHintText: { color: '#fff', textAlign: 'center', fontSize: 13 },
  mapActions: {
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  cancelBtn: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontSize: 16 },
  confirmBtn: {
    flex: 2, backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

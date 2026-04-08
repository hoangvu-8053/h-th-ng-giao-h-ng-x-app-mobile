import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { getMyOrders } from '../../services/api';
import { Order, OrderStatus } from '../../store/useOrderStore';

const STATUS_LABEL: Record<OrderStatus, string> = {
  searching: 'Đang tìm shipper',
  accepted: 'Shipper đã nhận',
  picking_up: 'Đang lấy hàng',
  delivering: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  searching: '#FF9500',
  accepted: '#007AFF',
  picking_up: '#5856D6',
  delivering: '#32ADE6',
  delivered: '#34C759',
  cancelled: '#FF3B30',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      const res = await getMyOrders();
      setOrders(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={orders}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            if (['searching', 'accepted', 'picking_up', 'delivering'].includes(item.status)) {
              navigation.navigate('TrackOrder', { orderId: item._id });
            }
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] }]}>
              <Text style={styles.badgeText}>{STATUS_LABEL[item.status]}</Text>
            </View>
          </View>

          <View style={styles.route}>
            <View style={styles.routeRow}>
              <Text style={styles.dot}>🟢</Text>
              <Text style={styles.address} numberOfLines={1}>{item.pickupAddress}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <Text style={styles.dot}>🔴</Text>
              <Text style={styles.address} numberOfLines={1}>{item.deliveryAddress}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.fee}>{item.fee?.toLocaleString('vi-VN')} đ</Text>
            {['searching', 'accepted', 'picking_up', 'delivering'].includes(item.status) && (
              <Text style={styles.viewLink}>Xem chi tiết →</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#666', fontSize: 16 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, padding: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { color: '#999', fontSize: 13 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  route: { marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeLine: { width: 2, height: 12, backgroundColor: '#ddd', marginLeft: 9, marginVertical: 2 },
  dot: { fontSize: 12 },
  address: { flex: 1, fontSize: 14, color: '#333' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  fee: { color: '#FF6B00', fontSize: 16, fontWeight: '700' },
  viewLink: { color: '#007AFF', fontSize: 13 },
});

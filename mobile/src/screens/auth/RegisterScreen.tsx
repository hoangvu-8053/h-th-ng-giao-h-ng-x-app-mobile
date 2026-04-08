import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { register } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { connectSocket } from '../../services/socket';

const ROLES = [
  { label: 'Khách hàng', value: 'customer' },
  { label: 'Tài xế giao hàng', value: 'shipper' },
];

const VEHICLE_TYPES = [
  { label: 'Xe máy', value: 'motorbike' },
  { label: 'Xe đạp', value: 'bicycle' },
  { label: 'Ô tô', value: 'car' },
];

export default function RegisterScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'customer' | 'shipper'>('customer');
  const [vehicleType, setVehicleType] = useState('motorbike');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleRegister() {
    if (!name || !phone || !password) {
      return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    }
    setLoading(true);
    try {
      const res = await register({ name, phone, password, role, vehicleType });
      await setAuth(res.data.token, res.data.user);
      await connectSocket();
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.response?.data?.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tạo tài khoản</Text>

      <TextInput style={styles.input} placeholder="Họ tên" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input} placeholder="Số điện thoại"
        keyboardType="phone-pad" value={phone} onChangeText={setPhone}
      />
      <TextInput
        style={styles.input} placeholder="Mật khẩu"
        secureTextEntry value={password} onChangeText={setPassword}
      />

      <Text style={styles.label}>Bạn là</Text>
      <View style={styles.row}>
        {ROLES.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.chip, role === r.value && styles.chipActive]}
            onPress={() => setRole(r.value as any)}
          >
            <Text style={[styles.chipText, role === r.value && styles.chipTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'shipper' && (
        <>
          <Text style={styles.label}>Phương tiện</Text>
          <View style={styles.row}>
            {VEHICLE_TYPES.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={[styles.chip, vehicleType === v.value && styles.chipActive]}
                onPress={() => setVehicleType(v.value)}
              >
                <Text style={[styles.chipText, vehicleType === v.value && styles.chipTextActive]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.btnText}>Đăng ký</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#fff', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF6B00', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    padding: 14, marginBottom: 14, fontSize: 16,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#ddd',
  },
  chipActive: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },
  chipText: { color: '#666', fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  btn: {
    backgroundColor: '#FF6B00', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#FF6B00', textAlign: 'center', marginTop: 20, fontSize: 14 },
});

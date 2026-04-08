import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Quyền truy cập vị trí',
        message: 'Ứng dụng cần truy cập vị trí của bạn để tìm shipper gần nhất.',
        buttonPositive: 'Cho phép',
        buttonNegative: 'Từ chối',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: xử lý qua Info.plist NSLocationWhenInUseUsageDescription
  const result = await Geolocation.requestAuthorization('whenInUse');
  return result === 'granted';
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  });
}

export function watchPosition(
  onUpdate: (coords: { lat: number; lng: number }) => void,
  interval = 4000
): number {
  return Geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    (err) => console.error('[Location]', err),
    { enableHighAccuracy: true, interval, fastestInterval: 2000, distanceFilter: 10 }
  );
}

export function clearWatch(watchId: number) {
  Geolocation.clearWatch(watchId);
}

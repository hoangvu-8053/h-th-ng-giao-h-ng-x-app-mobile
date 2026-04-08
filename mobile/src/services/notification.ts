import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import api from './api';

/**
 * Yêu cầu quyền thông báo và lấy FCM token, lưu lên server.
 * Gọi sau khi đăng nhập thành công.
 */
export async function setupPushNotifications(): Promise<void> {
  try {
    // Xin quyền (iOS cần explicit, Android 13+ cần POST_NOTIFICATIONS)
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await api.put('/auth/fcm-token', { fcmToken });
      console.log('[FCM] Token saved:', fcmToken.slice(0, 20) + '...');
    }

    // Refresh token listener
    messaging().onTokenRefresh(async (newToken) => {
      await api.put('/auth/fcm-token', { fcmToken: newToken });
    });
  } catch (err) {
    console.warn('[FCM] Setup failed:', err);
  }
}

/**
 * Lắng nghe notification khi app đang foreground.
 * Trả về unsubscribe function.
 */
export function listenForegroundNotifications(
  onOrderReceived: (data: Record<string, string>) => void
): () => void {
  return messaging().onMessage(async (remoteMessage) => {
    if (remoteMessage.data?.type === 'new_order') {
      onOrderReceived(remoteMessage.data as Record<string, string>);
    }
  });
}

/**
 * Lấy notification khởi động app (app bị tắt, user tap vào notification).
 * Trả về data nếu có, null nếu không.
 */
export async function getInitialNotification(): Promise<Record<string, string> | null> {
  const remoteMessage = await messaging().getInitialNotification();
  if (remoteMessage?.data?.type === 'new_order') {
    return remoteMessage.data as Record<string, string>;
  }
  return null;
}

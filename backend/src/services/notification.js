const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let initialized = false;

function initFirebase() {
  if (initialized) return;

  // Đọc service account từ file JSON (đặt tại backend/firebase-service-account.json)
  const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn('[FCM] firebase-service-account.json not found — push notifications disabled');
    return;
  }

  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log('[FCM] Firebase Admin initialized');
  } catch (err) {
    console.error('[FCM] Failed to initialize Firebase Admin:', err.message);
  }
}

/**
 * Gửi push notification tới một shipper
 * @param {string} fcmToken - FCM token của thiết bị
 * @param {object} data - Payload gửi kèm (orderId, pickupAddress, ...)
 */
async function sendOrderNotification(fcmToken, data) {
  if (!initialized) return;
  if (!fcmToken) return;

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title: '📦 Đơn hàng mới!',
        body: `${data.customerName} cần giao từ ${data.pickupAddress}`,
      },
      data: {
        type: 'new_order',
        orderId: String(data.orderId),
        pickupAddress: String(data.pickupAddress),
        deliveryAddress: String(data.deliveryAddress),
        fee: String(data.fee),
        distance: String(data.distance),
        customerName: String(data.customerName),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'orders',
          sound: 'default',
          priority: 'high',
        },
      },
    });
    console.log('[FCM] Push sent to shipper');
  } catch (err) {
    console.error('[FCM] Send failed:', err.message);
  }
}

module.exports = { initFirebase, sendOrderNotification };

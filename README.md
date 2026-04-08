# Shipper Finder App

Tìm shipper gần nhất đang free để nhận đơn hàng — theo thời gian thực.

## Kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)             │
│  ┌──────────────┐              ┌──────────────────────┐  │
│  │ Customer App │              │    Shipper App       │  │
│  │ - Xem map    │              │ - Toggle online/off  │  │
│  │ - Đặt đơn   │              │ - Nhận/từ chối đơn   │  │
│  │ - Track ship │              │ - Update trạng thái  │  │
│  └──────┬───────┘              └──────────┬───────────┘  │
└─────────┼────────────────────────────────┼──────────────┘
          │          REST + Socket.io       │
┌─────────▼────────────────────────────────▼──────────────┐
│                  Node.js + Express + Socket.io            │
│                                                          │
│  Algorithm: Haversine → Tìm shipper gần nhất đang free  │
│  Real-time: Socket.io rooms per order                    │
│  Auth: JWT                                               │
└─────────────────────────┬───────────────────────────────┘
                          │
                  ┌───────▼───────┐
                  │    MongoDB    │
                  │ Users, Orders │
                  └───────────────┘
```

## Luồng hoạt động

1. **Shipper** mở app → bật Online → gửi vị trí mỗi 4 giây qua Socket.io
2. **Customer** mở app → xem map (shipper gần nhất hiện dưới dạng markers)
3. Customer đặt đơn → Backend dùng **Haversine formula** tìm shipper gần nhất trong 10km đang free
4. Shipper nhận thông báo popup → Nhận/Từ chối
   - Nếu từ chối → tự động thử shipper gần thứ 2, thứ 3...
5. Shipper nhận đơn → Customer thấy shipper trên map theo thời gian thực
6. Shipper cập nhật trạng thái: `picking_up` → `delivering` → `delivered`

## Cài đặt

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Sửa MONGO_URI, JWT_SECRET, GOOGLE_MAPS_API_KEY trong .env
npm run dev
```

### Mobile

```bash
cd mobile
npm install

# Android
npx react-native run-android

# iOS
cd ios && pod install && cd ..
npx react-native run-ios
```

### Lưu ý cấu hình

- **Android emulator**: URL backend đã set là `http://10.0.2.2:3000` (localhost của máy host)
- **Thiết bị thật**: Đổi IP trong `src/services/api.ts` và `src/services/socket.ts`
  ```ts
  const BASE_URL = 'http://192.168.x.x:3000/api';
  const SOCKET_URL = 'http://192.168.x.x:3000';
  ```
- **Google Maps**: Thêm API key vào `android/app/src/main/AndroidManifest.xml`
  ```xml
  <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>
  ```

## Cấu trúc thư mục

```
C5/
├── backend/
│   └── src/
│       ├── server.js              # Entry point
│       ├── models/
│       │   ├── User.js            # Customer & Shipper
│       │   └── Order.js
│       ├── routes/
│       │   ├── auth.js            # Đăng ký / Đăng nhập
│       │   ├── orders.js          # CRUD đơn hàng
│       │   └── shippers.js        # Tìm shipper gần nhất
│       ├── socket/
│       │   └── handlers.js        # Socket.io events
│       ├── middleware/
│       │   └── auth.js            # JWT middleware
│       └── utils/
│           └── geo.js             # Haversine formula
└── mobile/
    └── src/
        ├── navigation/
        │   └── AppNavigator.tsx
        ├── screens/
        │   ├── auth/              # Login, Register
        │   ├── customer/          # Home, CreateOrder, TrackOrder
        │   └── shipper/           # ShipperHome, ActiveDelivery
        ├── services/
        │   ├── api.ts             # Axios REST calls
        │   ├── socket.ts          # Socket.io client
        │   └── location.ts        # GPS service
        └── store/
            ├── useAuthStore.ts    # Zustand: auth state
            └── useOrderStore.ts   # Zustand: order state
```

## Socket.io Events

| Event | Direction | Mô tả |
|---|---|---|
| `shipper:go_online` | Shipper → Server | Bắt đầu ca, gửi vị trí |
| `shipper:go_offline` | Shipper → Server | Kết thúc ca |
| `shipper:update_location` | Shipper → Server | Cập nhật GPS mỗi 4s |
| `new_order_request` | Server → Shipper | Có đơn mới cần nhận |
| `shipper:accept_order` | Shipper → Server | Nhận đơn |
| `shipper:reject_order` | Shipper → Server | Từ chối → thử shipper tiếp |
| `shipper:update_order_status` | Shipper → Server | picking_up / delivering / delivered |
| `order:accepted` | Server → Customer | Shipper đã nhận |
| `shipper:location_update` | Server → Customer | Vị trí shipper realtime |
| `order:status_updated` | Server → Customer | Cập nhật trạng thái |
| `customer:watch_order` | Customer → Server | Join room theo dõi đơn |

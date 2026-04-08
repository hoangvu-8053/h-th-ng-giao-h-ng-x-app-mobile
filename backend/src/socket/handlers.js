const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const { findNearestFreeShippers } = require('../utils/geo');

function registerSocketHandlers(io, onlineShippers, pendingOrders) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Không có token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User không tồn tại'));

      socket.user = { id: user._id.toString(), name: user.name, role: user.role };
      next();
    } catch {
      next(new Error('Token không hợp lệ'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.user.name} (${socket.user.role})`);

    // ── SHIPPER ──────────────────────────────────────────────────────────────

    socket.on('shipper:go_online', async (data) => {
      if (socket.user.role !== 'shipper') return;
      const { lat, lng, vehicleType } = data;
      const user = await User.findById(socket.user.id);

      onlineShippers.set(socket.id, {
        shipperId: socket.user.id,
        name: socket.user.name,
        vehicleType: vehicleType || user.vehicleType,
        rating: user.rating,
        lat, lng,
        status: 'free',
      });

      socket.emit('shipper:status_updated', { status: 'free', online: true });
      console.log(`[Shipper] ${socket.user.name} ONLINE (${lat}, ${lng})`);
    });

    socket.on('shipper:go_offline', () => {
      if (socket.user.role !== 'shipper') return;
      onlineShippers.delete(socket.id);
      socket.emit('shipper:status_updated', { status: 'offline', online: false });
      console.log(`[Shipper] ${socket.user.name} OFFLINE`);
    });

    socket.on('shipper:update_location', (data) => {
      if (socket.user.role !== 'shipper') return;
      const { lat, lng } = data;
      const info = onlineShippers.get(socket.id);
      if (!info) return;

      info.lat = lat;
      info.lng = lng;

      if (info.currentOrderId) {
        io.to(`order_${info.currentOrderId}`).emit('shipper:location_update', {
          orderId: info.currentOrderId,
          lat, lng,
        });
      }
    });

    socket.on('shipper:accept_order', async ({ orderId }) => {
      if (socket.user.role !== 'shipper') return;

      const order = await Order.findById(orderId);
      if (!order || order.status !== 'searching') {
        return socket.emit('order:already_taken', { orderId });
      }

      order.shipper = socket.user.id;
      order.status = 'accepted';
      order.acceptedAt = new Date();
      await order.save();

      const info = onlineShippers.get(socket.id);
      if (info) {
        info.status = 'busy';
        info.currentOrderId = orderId;
      }

      socket.join(`order_${orderId}`);

      io.to(`order_${orderId}`).emit('order:accepted', {
        orderId,
        shipper: {
          id: socket.user.id,
          name: socket.user.name,
          vehicleType: info?.vehicleType,
          rating: info?.rating,
          lat: info?.lat,
          lng: info?.lng,
        },
      });

      socket.emit('shipper:order_confirmed', { orderId, order });
      console.log(`[Order] ${socket.user.name} nhận đơn ${orderId}`);
    });

    socket.on('shipper:reject_order', ({ orderId }) => {
      if (socket.user.role !== 'shipper') return;

      const pending = pendingOrders.get(orderId);
      if (!pending) return;

      pending.currentIndex += 1;
      if (pending.currentIndex < pending.allCandidates.length) {
        const nextSocketId = pending.allCandidates[pending.currentIndex];
        io.to(nextSocketId).emit('new_order_request', pending.orderData);
      } else {
        io.to(`order_${orderId}`).emit('order:no_shipper_found', { orderId });
        pendingOrders.delete(orderId);
      }
    });

    socket.on('shipper:update_order_status', async ({ orderId, status }) => {
      if (socket.user.role !== 'shipper') return;
      const validStatuses = ['picking_up', 'delivering', 'delivered'];
      if (!validStatuses.includes(status)) return;

      const order = await Order.findById(orderId);
      if (!order || order.shipper?.toString() !== socket.user.id) return;

      order.status = status;
      if (status === 'delivered') {
        order.deliveredAt = new Date();
        const info = onlineShippers.get(socket.id);
        if (info) {
          info.status = 'free';
          delete info.currentOrderId;
        }
        await User.findByIdAndUpdate(socket.user.id, { $inc: { totalDeliveries: 1 } });
      }
      await order.save();

      io.to(`order_${orderId}`).emit('order:status_updated', { orderId, status });
    });

    // ── CUSTOMER ─────────────────────────────────────────────────────────────

    socket.on('customer:watch_order', ({ orderId }) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('customer:stop_watching', ({ orderId }) => {
      socket.leave(`order_${orderId}`);
    });

    // ── DISCONNECT ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      if (socket.user.role === 'shipper') {
        const info = onlineShippers.get(socket.id);
        if (info?.currentOrderId) {
          io.to(`order_${info.currentOrderId}`).emit('shipper:disconnected', {
            orderId: info.currentOrderId,
          });
        }
        onlineShippers.delete(socket.id);
      }
      console.log(`[Socket] Disconnected: ${socket.user.name}`);
    });
  });
}

module.exports = { registerSocketHandlers };

const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { findNearestFreeShippers } = require('../utils/geo');
const { sendOrderNotification } = require('../services/notification');

// POST /api/orders
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Chỉ customer mới tạo được đơn hàng' });
    }

    const {
      pickupAddress, pickupLocation,
      deliveryAddress, deliveryLocation,
      packageDescription, estimatedWeight, fee,
    } = req.body;

    const order = await Order.create({
      customer: req.user.id,
      pickupAddress, pickupLocation,
      deliveryAddress, deliveryLocation,
      packageDescription, estimatedWeight, fee,
    });

    const io = req.app.get('io');
    const onlineShippers = req.app.get('onlineShippers');
    const nearestShippers = findNearestFreeShippers(pickupLocation, onlineShippers);

    if (nearestShippers.length === 0) {
      return res.status(200).json({
        order,
        message: 'Không tìm thấy shipper nào gần đây.',
        nearestCount: 0,
      });
    }

    const nearest = nearestShippers[0];
    const orderData = {
      orderId: order._id,
      pickupAddress, pickupLocation,
      deliveryAddress, deliveryLocation,
      packageDescription, fee,
      distance: nearest.distance.toFixed(2),
      customerName: req.user.name,
    };

    io.to(nearest.socketId).emit('new_order_request', orderData);

    // Push notification (app ở background / tắt)
    const shipperUser = await User.findById(nearest.shipperId).select('fcmToken');
    if (shipperUser?.fcmToken) {
      sendOrderNotification(shipperUser.fcmToken, orderData);
    }

    req.app.get('pendingOrders').set(order._id.toString(), {
      orderData,
      allCandidates: nearestShippers.map(s => s.socketId),
      currentIndex: 0,
    });

    res.status(201).json({ order, nearestCount: nearestShippers.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/my
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const filter = req.user.role === 'customer'
      ? { customer: req.user.id }
      : { shipper: req.user.id };

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customer', 'name phone')
      .populate('shipper', 'name phone rating vehicleType');

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('shipper', 'name phone rating vehicleType avatarUrl');

    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/orders/:id/cancel
router.patch('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Không có quyền hủy đơn này' });
    }
    if (!['searching', 'accepted'].includes(order.status)) {
      return res.status(400).json({ message: 'Không thể hủy đơn ở trạng thái này' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = req.body.reason || '';
    await order.save();

    if (order.shipper) {
      const io = req.app.get('io');
      const onlineShippers = req.app.get('onlineShippers');
      for (const [socketId, s] of onlineShippers.entries()) {
        if (s.shipperId === order.shipper.toString()) {
          io.to(socketId).emit('order_cancelled', { orderId: order._id });
          break;
        }
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

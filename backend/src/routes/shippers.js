const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { findNearestFreeShippers } = require('../utils/geo');

// GET /api/shippers/nearby — Lấy danh sách shipper gần nhất đang free
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Cần cung cấp tọa độ lat, lng' });
    }

    const onlineShippers = req.app.get('onlineShippers');
    const nearest = findNearestFreeShippers(
      { lat: parseFloat(lat), lng: parseFloat(lng) },
      onlineShippers,
      parseFloat(radius)
    );

    // Trả về thông tin tối thiểu (ẩn socketId)
    const result = nearest.map(s => ({
      shipperId: s.shipperId,
      name: s.name,
      vehicleType: s.vehicleType,
      rating: s.rating,
      lat: s.lat,
      lng: s.lng,
      distance: s.distance.toFixed(2),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

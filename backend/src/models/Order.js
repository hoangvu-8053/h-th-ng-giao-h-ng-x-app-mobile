const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  pickupAddress: { type: String, required: true },
  pickupLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  deliveryAddress: { type: String, required: true },
  deliveryLocation: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  packageDescription: { type: String, default: '' },
  estimatedWeight: { type: Number, default: 1 }, // kg
  fee: { type: Number, required: true }, // VND

  status: {
    type: String,
    enum: ['searching', 'accepted', 'picking_up', 'delivering', 'delivered', 'cancelled'],
    default: 'searching',
  },

  shipperLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },

  acceptedAt: { type: Date },
  deliveredAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);

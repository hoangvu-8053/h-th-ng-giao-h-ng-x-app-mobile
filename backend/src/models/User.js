const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'shipper'], required: true },
  // Shipper-only fields
  vehicleType: { type: String, enum: ['motorbike', 'bicycle', 'car'], default: 'motorbike' },
  avatarUrl: { type: String, default: '' },
  rating: { type: Number, default: 5.0 },
  totalDeliveries: { type: Number, default: 0 },
  fcmToken: { type: String, default: '' },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

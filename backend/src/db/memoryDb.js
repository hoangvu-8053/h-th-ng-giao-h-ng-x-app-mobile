/**
 * In-memory database — thay thế MongoDB cho demo/dev
 * Dữ liệu sẽ mất khi restart server
 */
const { v4: uuidv4 } = require('uuid');

const collections = {
  users: new Map(),   // id → user object
  orders: new Map(),  // id → order object
};

function newId() {
  return uuidv4();
}

// ── Users ─────────────────────────────────────────────────────────────────────

function createUser(data) {
  const id = newId();
  const user = {
    _id: id,
    id,
    name: data.name,
    phone: data.phone,
    password: data.password, // already hashed by caller
    role: data.role,
    vehicleType: data.vehicleType || 'motorbike',
    avatarUrl: '',
    rating: 5.0,
    totalDeliveries: 0,
    createdAt: new Date(),
  };
  collections.users.set(id, user);
  return user;
}

function findUserByPhone(phone) {
  for (const u of collections.users.values()) {
    if (u.phone === phone) return u;
  }
  return null;
}

function findUserById(id) {
  return collections.users.get(id) || null;
}

function updateUser(id, patch) {
  const u = collections.users.get(id);
  if (!u) return null;
  Object.assign(u, patch);
  return u;
}

// ── Orders ────────────────────────────────────────────────────────────────────

function createOrder(data) {
  const id = newId();
  const order = {
    _id: id,
    id,
    customer: data.customer,
    shipper: null,
    pickupAddress: data.pickupAddress,
    pickupLocation: data.pickupLocation,
    deliveryAddress: data.deliveryAddress,
    deliveryLocation: data.deliveryLocation,
    packageDescription: data.packageDescription || '',
    estimatedWeight: data.estimatedWeight || 1,
    fee: data.fee,
    status: 'searching',
    shipperLocation: null,
    acceptedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancelReason: '',
    createdAt: new Date(),
  };
  collections.orders.set(id, order);
  return order;
}

function findOrderById(id) {
  return collections.orders.get(id) || null;
}

function findOrdersByUser(userId, role) {
  const result = [];
  for (const o of collections.orders.values()) {
    const match = role === 'customer'
      ? o.customer === userId
      : o.shipper === userId;
    if (match) result.push(o);
  }
  return result.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
}

function updateOrder(id, patch) {
  const o = collections.orders.get(id);
  if (!o) return null;
  Object.assign(o, patch);
  return o;
}

// ── Populate helper (giả lập Mongoose .populate) ──────────────────────────────

function populateOrder(order) {
  if (!order) return null;
  const clone = { ...order };
  if (clone.customer) {
    const u = findUserById(clone.customer);
    clone.customer = u ? { _id: u._id, name: u.name, phone: u.phone } : clone.customer;
  }
  if (clone.shipper) {
    const u = findUserById(clone.shipper);
    clone.shipper = u
      ? { _id: u._id, name: u.name, phone: u.phone, rating: u.rating, vehicleType: u.vehicleType, avatarUrl: u.avatarUrl }
      : clone.shipper;
  }
  return clone;
}

module.exports = {
  createUser, findUserByPhone, findUserById, updateUser,
  createOrder, findOrderById, findOrdersByUser, updateOrder, populateOrder,
};

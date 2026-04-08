/**
 * Haversine formula — tính khoảng cách giữa 2 tọa độ (km)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Tìm các shipper gần nhất đang free
 * @param {Object} customerLocation - { lat, lng }
 * @param {Map} onlineShippers - Map<socketId, { lat, lng, status, shipperId, name, ... }>
 * @param {number} radiusKm - Bán kính tìm kiếm
 * @returns {Array} Sorted shippers by distance
 */
function findNearestFreeShippers(customerLocation, onlineShippers, radiusKm = 10) {
  const results = [];

  for (const [socketId, shipper] of onlineShippers.entries()) {
    if (shipper.status !== 'free') continue;

    const distance = haversineDistance(
      customerLocation.lat,
      customerLocation.lng,
      shipper.lat,
      shipper.lng
    );

    if (distance <= radiusKm) {
      results.push({ ...shipper, socketId, distance });
    }
  }

  return results.sort((a, b) => a.distance - b.distance);
}

module.exports = { haversineDistance, findNearestFreeShippers };

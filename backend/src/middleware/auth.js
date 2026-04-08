const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Không có token xác thực' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(401).json({ message: 'Token không hợp lệ' });

    req.user = { id: user._id.toString(), name: user.name, role: user.role };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token hết hạn hoặc không hợp lệ' });
  }
}

module.exports = { authMiddleware };

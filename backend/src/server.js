require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const shipperRoutes = require('./routes/shippers');
const { registerSocketHandlers } = require('./socket/handlers');
const { initFirebase } = require('./services/notification');

initFirebase();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

const onlineShippers = new Map();
const pendingOrders = new Map();

app.set('io', io);
app.set('onlineShippers', onlineShippers);
app.set('pendingOrders', pendingOrders);

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shippers', shipperRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }));

registerSocketHandlers(io, onlineShippers, pendingOrders);

const PORT = process.env.PORT || 3000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB connected');
    server.listen(PORT, () => console.log(`[Server] Running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  });

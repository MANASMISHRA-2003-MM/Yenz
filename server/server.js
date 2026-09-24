const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const prisma = require('./utils/prisma');
const { generalApiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler, notFound } = require('./middlewares/errorMiddleware');
const { initSocket } = require('./socket/socketHandler');
const seedData = require('./utils/seed');

// Import modular routes
const authRoutes = require('./modules/auth/authRoutes');
const restaurantRoutes = require('./modules/restaurant/restaurantRoutes');
const foodRoutes = require('./modules/food/foodRoutes');
const categoryRoutes = require('./modules/category/categoryRoutes');
const cartRoutes = require('./modules/cart/cartRoutes');
const orderRoutes = require('./modules/order/orderRoutes');
const deliveryRoutes = require('./modules/delivery/deliveryRoutes');
const couponRoutes = require('./modules/coupon/couponRoutes');
const reviewRoutes = require('./modules/review/reviewRoutes');
const adminRoutes = require('./modules/admin/adminRoutes');
const analyticsRoutes = require('./modules/analytics/analyticsRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
app.set('socketio', io);
initSocket(io);

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply General Rate Limiter
app.use('/api', generalApiLimiter);

// Root & Health Check Endpoints
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Krawing/Yenz Backend API Server is running smoothly!',
    health: '/health',
    api: '/api'
  });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.get('/health', async (req, res) => {
  let dbStatus = 'Disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'Connected (PostgreSQL + Prisma)';
  } catch (err) {
    dbStatus = `Connection issue: ${err.message}`;
  }

  res.json({
    status: 'OK',
    service: 'Krawing Hyperlocal Food Delivery Engine',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Modular Routes Registration
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect Database & Start Server
const startServer = async () => {
  try {
    console.log('Connecting to PostgreSQL database via Prisma...');
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database successfully via Prisma.');

    // Seed check
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log('Empty database detected. Running seed script...');
        await seedData();
      }
    } catch (seedErr) {
      console.warn('Seed check note:', seedErr.message);
    }
  } catch (err) {
    console.warn('⚠️ Could not connect to PostgreSQL database on startup:', err.message);
    console.warn('👉 Please ensure PostgreSQL container is running: docker-compose up -d');
  }

  server.listen(PORT, () => {
    console.log(`
======================================================
🚀 KRAWING HYPERLOCAL FOOD DELIVERY PLATFORM RUNNING!
🐘 Database Engine: PostgreSQL + Prisma ORM
📡 Server Listening on Port: ${PORT}
🌐 API Base Endpoint: http://localhost:${PORT}/api
⚡ Socket.IO Engine: ACTIVE
======================================================
    `);
  });
};

startServer();

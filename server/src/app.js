const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { requestLogger } = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const sanitize = require('./middlewares/sanitize');
const { apiLimiter } = require('./middlewares/rateLimit');
// app.use('/api/auth', authRoutes); // Auth handled by Supabase
const dashboardRoutes = require('./routes/dashboardRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Security & basic middlewares
app.use(
  helmet({
    contentSecurityPolicy: false // can be enabled and tuned when you serve a fixed frontend origin
  })
);
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true
  })
);
app.use(express.json());
app.use(sanitize);
app.use('/api', apiLimiter);
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'campus-connect-server' });
});

// Routes
// app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 + error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;


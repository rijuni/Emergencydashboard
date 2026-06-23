const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const devOriginPattern = new RegExp(
  "^http://(localhost|127\\.0\\.0\\.1)(:\\d+)?$|" +
  "^http://10\\.10\\.2\\.95(:\\d+)?$|" +
  "^http://[a-zA-Z0-9-]+(:\\d+)?$",
  "i",
);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    // In non-production, trust all origins for easier local network testing
    return true;
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in development, or if in allowedOrigins
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      // Instead of throwing an error which causes 500, we pass false to reject CORS cleanly
      return callback(null, false);
    },
    credentials: true,
  }),
);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased drastically for internal NAT usage
  message: { message: 'Too many login attempts. Please try again later.' }
});

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static files for certificate uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/staff', require('./routes/staffRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/roster', require('./routes/rosterRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/display', require('./routes/displayRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏥 Hospital Casualty Dashboard Server`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🖥️  Display: http://localhost:${PORT}/api/display/today\n`);
});

module.exports = app;

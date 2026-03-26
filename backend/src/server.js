const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

const analyzeRouter = require('./routes/analyze');
const { connectDatabase } = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// Log startup
console.log('[INFO] Backend service starting...');
console.log('[INFO] Environment:', process.env.NODE_ENV || 'development');
console.log('[INFO] AI Service URL:', process.env.AI_SERVICE_URL || 'http://localhost:8000');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', analyzeRouter);

// 404 handler
app.use((req, res) => {
  console.warn(`[WARN] Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Error handler (must be last)
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  console.error('[ERROR] Stack:', err.stack);
  const status = err.status || 500;
  const retryAfterSeconds = status === 503 && Number.isFinite(err.retryAfterSeconds)
    ? err.retryAfterSeconds
    : undefined;
  const message =
    process.env.NODE_ENV === 'development' || status === 503
      ? err.message
      : 'Something went wrong while processing your request.';

  if (retryAfterSeconds) {
    res.set('Retry-After', String(retryAfterSeconds));
  }
  
  res.status(status).json({
    error: 'Internal server error',
    message,
    retry_after_seconds: retryAfterSeconds,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Database connection (optional, graceful degradation)
connectDatabase();

// Start server
app.listen(PORT, () => {
  console.log(`[INFO] Backend running on port ${PORT}`);
  console.log(`[INFO] API available at http://localhost:${PORT}/api`);
  console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
});

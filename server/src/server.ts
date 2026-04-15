import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import webhookRoutes from './routes/webhook.route.js';
import apiRoutes from './routes/api.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// --- Middleware order per skill spec: helmet → cors → json → routes → errorHandler ---

// Security headers
app.use(helmet());

// CORS
app.use(cors());

// Rate limiting: 100 req/15min globally
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests', code: 'RATE_LIMITED' },
});
app.use(globalLimiter);

// Stricter rate limit for auth: 10 req/15min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts', code: 'RATE_LIMITED' },
});
app.use('/api/auth', authLimiter);

// Webhook route needs raw body buffer for signature validation BEFORE json parsing
app.use(
  '/webhook',
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// JSON parsing for all other routes
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);

// Global error handler (last)
app.use(errorHandler);

export default app;

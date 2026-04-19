require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const config = require('./config/config');
const logger = require('./utils/logger');
const apiRoutes = require('./routes');
const { requestAuditMiddleware } = require('./middleware/audit');
const { error: errorResponse } = require('./utils/response');

const app = express();

// ─── Trust proxy (for correct IP behind load balancer / Nginx) ────────────────
app.set('trust proxy', 1);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Compression ─────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── HTTP request logging ────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.url === '/api/v1/health',
}));

// ─── Global rate limiter ─────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.env === 'test' ? 100000 : config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));

// ─── Audit middleware ────────────────────────────────────────────────────────
app.use(requestAuditMiddleware);

// ─── Swagger API Docs ────────────────────────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Privora API',
      version: '1.0.0',
      description: 'Consent Management Platform API — Saudi PDPL Aligned',
      contact: { name: 'Privora Team', email: 'api@privora.sa' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, 'routes', '*.js')],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Privora API Docs',
}));

// Expose raw spec
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  errorResponse(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, 'Database validation error', 422, err.errors?.map((e) => e.message));
  }

  if (config.env === 'production') {
    return errorResponse(res, 'Internal server error', 500);
  }

  return errorResponse(res, err.message, 500);
});

module.exports = app;

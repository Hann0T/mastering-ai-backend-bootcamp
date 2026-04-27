import helmet from 'helmet';
import express from 'express';
import apiRouter from './src/routes/api';
import webhookRouter from './src/routes/webhooks';
import logger from './src/middleware/logger';
import { errorHandler } from './src/middleware/errorHandler.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger';
import { bullBoardAdapter } from './src/config/bull-board';
import { sanitizeInput } from './src/middleware/sanitize';

const app = express();

// pre-route middlewares
app.use(logger);

app.use('/webhooks',
  express.raw({
    type: 'application/json',
    verify: (req: any, _, buf) => {
      req.rawBody = buf;
    },
  }),
  webhookRouter
);

app.use(express.json());
app.use(sanitizeInput);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      // Allow Swagger UI if you serve it
      // scriptSrc: ["'self'", "'unsafe-inline'"],
      // styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// routes
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/v1', apiRouter);

app.use('/api-docs',
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
      },
    },
  }),
  swaggerUi.serve, swaggerUi.setup(swaggerSpec)
);

app.get('/api/docs.json', (_, res) => {
  res.json(swaggerSpec);
});

// TODO: use auth middleware
app.use('/admin/queues', bullBoardAdapter.getRouter());

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` }
  });
});

// global error handling (MUST BE LAST)
app.use(errorHandler);

export default app;

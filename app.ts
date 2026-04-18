import express from 'express';
import apiRouter from './src/routes/api';
import logger from './src/middleware/logger';
import { errorHandler } from './src/middleware/errorHandler.middleware';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger';
import { bullBoardAdapter } from './src/config/bull-board';

const app = express();

// pre-route middlewares
app.use(logger);
app.use(express.json());

// routes
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api/v1', apiRouter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_, res) => {
  res.json(swaggerSpec);
});

// use auth middleware
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

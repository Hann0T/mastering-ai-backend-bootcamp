import express from 'express';
import apiRouter from './src/routes/api';
import logger from './src/middleware/logger';
import { errorHandler } from './src/middleware/error';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger';

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

// error handling
app.use(errorHandler);

export default app;

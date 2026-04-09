import express from 'express';
import apiRouter from './src/routes/api';
import logger from './src/middleware/logger';
import { errorHandler } from './src/middleware/error';

const app = express();

// pre-route middlewares
app.use(logger);
app.use(express.json());

// routes
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use('/api', apiRouter);

// error handling
app.use(errorHandler);

export default app;

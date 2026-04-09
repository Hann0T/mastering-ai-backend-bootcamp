import 'dotenv/config';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';
import authRoutes from './src/routes/auth';
import documentRoutes from './src/routes/documents';
import { errorHandler } from './src/middleware/error';

const app = express()

// logging setup
const logPath = new URL('./logs/access.log', import.meta.url);
const stream = fs.createWriteStream(logPath, { flags: 'a' });

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream }));
}

// JSON parsing
app.use(express.json())

// routes
app.use('/api/auth', authRoutes)
app.use('/api/documents', documentRoutes)
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// error handling
app.use(errorHandler);

export default app;

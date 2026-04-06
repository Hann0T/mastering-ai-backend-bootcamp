import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import fs from 'fs';
import express from 'express';
import morgan from 'morgan';

const app = express()
const port = process.env.PORT || 3000;

const logPath = new URL('./logs/access.log', import.meta.url);
const stream = fs.createWriteStream(logPath, { flags: 'a' });

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
app.use(morgan('combined', { stream }));
// app.use(morgan(':method :url :status :response-time ms', { stream }));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

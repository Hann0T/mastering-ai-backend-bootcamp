import fs from 'fs';
import morgan from 'morgan';

const logsDir = new URL('../../logs/', import.meta.url);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logPath = new URL('access.log', logsDir);
const stream = fs.createWriteStream(logPath, { flags: 'a' });

const logger = process.env.NODE_ENV === 'development'
  ? morgan('dev')
  : morgan('combined', { stream })

export default logger;

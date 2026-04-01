import fs from 'fs';
import path from 'path';
import express from 'express';
import morgan from 'morgan';

const app = express()
const port = 3000

const logPath = new URL('./logs/access.log', import.meta.url);
const stream = fs.createWriteStream(logPath, { flags: 'a' });

app.use(morgan('dev'));
// app.use(morgan(':method :url :status :response-time ms', { stream }));
app.use(morgan('combined', { stream }));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

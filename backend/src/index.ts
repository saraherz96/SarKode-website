import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import contactRouter from './routes/contact';
import chatRouter from './routes/chat';
import scheduleCallRouter from './routes/schedule-call';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
// Comma-separated list so both the apex and www domains (or prod + local dev) can be allowed at once.
const ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: ORIGINS }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/contact', contactRouter);
app.use('/api/chat', chatRouter);
app.use('/api/schedule-call', scheduleCallRouter);

app.listen(PORT, () => {
  console.log(`SarKode API listening on http://localhost:${PORT} (CORS origins: ${ORIGINS.join(', ')})`);
});

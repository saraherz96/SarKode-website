import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import contactRouter from './routes/contact';
import chatRouter from './routes/chat';
import scheduleCallRouter from './routes/schedule-call';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/contact', contactRouter);
app.use('/api/chat', chatRouter);
app.use('/api/schedule-call', scheduleCallRouter);

app.listen(PORT, () => {
  console.log(`SarKode API listening on http://localhost:${PORT} (CORS origin: ${ORIGIN})`);
});

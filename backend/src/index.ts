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

// Exportado para las pruebas (backend/src/__tests__/) — supertest monta `app` directamente sin
// abrir un puerto real. Solo escucha cuando este archivo se ejecuta como entrypoint (`npm run
// dev`/`npm start`), no cuando algo más lo importa.
export default app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SarKode API listening on http://localhost:${PORT} (CORS origins: ${ORIGINS.join(', ')})`);
  });
}

import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleDubPayload,
  handleTranscribePayload,
  handleTtsPayload,
} from './api/_geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/tts', async (req: Request, res: Response) => {
    const result = await handleTtsPayload((req.body ?? {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const result = await handleTranscribePayload(
      (req.body ?? {}) as Record<string, unknown>
    );
    res.status(result.status).json(result.body);
  });

  app.post('/api/dub', async (req: Request, res: Response) => {
    const result = await handleDubPayload((req.body ?? {}) as Record<string, unknown>);
    res.status(result.status).json(result.body);
  });

  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err instanceof Error ? err.message : 'Permintaan API tidak valid.';
    res.status(400).json({ error: msg });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SuaraKita Studio server listening on http://localhost:${PORT}`);
  });
}

startServer();

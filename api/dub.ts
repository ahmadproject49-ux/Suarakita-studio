import { handleDubPayload } from './_geminiService.ts';

interface ServerlessReq {
  method?: string;
  body?: unknown;
}

interface ServerlessRes {
  status: (code: number) => ServerlessRes;
  json: (data: unknown) => void;
}

export default async function handler(req: ServerlessReq, res: ServerlessRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
    return;
  }

  let bodyObj: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      bodyObj = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: 'Body JSON tidak valid.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    bodyObj = req.body as Record<string, unknown>;
  }

  const result = await handleDubPayload(bodyObj);
  res.status(result.status).json(result.body);
}

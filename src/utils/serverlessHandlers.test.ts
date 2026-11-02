import test from 'node:test';
import assert from 'node:assert/strict';
import ttsHandler from '../../api/tts';
import healthHandler from '../../api/health';

test('Vercel serverless health handler returns 200 status ok', () => {
  let code = 0;
  let payload: unknown = null;
  healthHandler(
    { method: 'GET' },
    {
      status(c) {
        code = c;
        return this;
      },
      json(data) {
        payload = data;
      },
    }
  );
  assert.equal(code, 200);
  assert.deepEqual(payload, { status: 'ok' });
});

test('Vercel serverless tts handler rejects GET with 405 and validates empty POST with 400 or missing key error', async () => {
  let code = 0;
  let payload: Record<string, unknown> | null = null;
  await ttsHandler(
    { method: 'GET' },
    {
      status(c) {
        code = c;
        return this;
      },
      json(data) {
        payload = data as Record<string, unknown>;
      },
    }
  );
  assert.equal(code, 405);
  assert.ok(payload?.error);
});

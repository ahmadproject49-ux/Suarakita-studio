import test from 'node:test';
import assert from 'node:assert/strict';
import { postApiJson } from './apiClient';

test('postApiJson parses valid JSON responses cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ audioBase64: 'UklGRg==', mimeType: 'audio/wav' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;

  try {
    const res = await postApiJson<{ audioBase64: string }>('/api/tts', { text: 'Halo' });
    assert.equal(res.audioBase64, 'UklGRg==');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('postApiJson turns plain-text "The page could not be found" 404 into clear Indonesian error without JSON SyntaxError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('The page could not be found\n\nNOT_FOUND', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    })) as typeof fetch;

  try {
    await assert.rejects(
      () => postApiJson('/api/tts', { text: 'Halo' }),
      (err: Error) => {
        assert.ok(!err.message.includes('Unexpected token'));
        assert.ok(err.message.includes('HTTP 404'));
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

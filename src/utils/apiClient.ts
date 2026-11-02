/**
 * Safely executes fetch() and parses JSON responses without crashing with
 * `SyntaxError: Unexpected token 'T', "The page c"... is not valid JSON`
 * when a proxy, CDN, or server returns a plain-text or HTML error page (404, 502, 504, etc.).
 */
export async function postApiJson<T = Record<string, unknown>>(
  endpoint: string,
  payload: unknown
): Promise<T> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let parsed: Record<string, unknown> | null = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
      throw new Error(parsed.error);
    }

    const snippet = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (
      response.status === 404 ||
      snippet.toLowerCase().includes('the page could not be found') ||
      snippet.toLowerCase().includes('cannot post')
    ) {
      throw new Error(
        `Layanan backend (${endpoint}) belum aktif di alamat ini (HTTP 404). Pastikan kode terbaru (termasuk folder /api dan vercel.json) sudah di-push/deploy ulang, serta variabel GEMINI_API_KEY telah ditambahkan di Environment Variables hosting Anda.`
      );
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new Error(
        `Server sedang sibuk atau batas waktu habis (HTTP ${response.status}). Silakan coba lagi dengan teks yang sedikit lebih pendek.`
      );
    }
    throw new Error(
      snippet
        ? `Gagal memproses permintaan (HTTP ${response.status}): ${snippet.slice(0, 140)}`
        : `Gagal memproses permintaan (HTTP ${response.status}).`
    );
  }

  if (!parsed) {
    throw new Error(
      'Server mengembalikan format respons yang bukan JSON. Silakan muat ulang halaman dan coba kembali.'
    );
  }

  return parsed as T;
}

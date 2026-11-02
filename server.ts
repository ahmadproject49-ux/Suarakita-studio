import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const VALID_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum tersedia di lingkungan server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID') || raw.includes('403')) {
    return {
      status: 403,
      message:
        'Kunci API tidak valid atau tidak memiliki izin. Silakan periksa kunci API Anda di panel Settings > Secrets.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        'Batas kuota API tercapai. Anda dapat meningkatkan kuota melalui panel Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: raw || 'Terjadi kesalahan saat memproses permintaan audio.',
  };
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  /**
   * POST /api/tts
   * Supports:
   * - modelChoice: 'flash-lite' (gemini-3.8-flash-lite-tts) | 'flash-hd' (gemini-3.8-flash-tts)
   * - mode: 'single' | 'dialogue'
   */
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const {
        mode = 'single',
        modelChoice = 'flash-lite',
        text,
        voice = 'Kore',
        style = '',
        secondVoice = 'Puck',
        secondStyle = '',
        turns = [],
      } = req.body ?? {};

      const ai = getGenAIClient();

      if (mode === 'dialogue') {
        if (!Array.isArray(turns) || turns.length < 2) {
          res.status(400).json({
            error: 'Mode dialog membutuhkan minimal 2 baris percakapan.',
          });
          return;
        }

        const primaryVoice = VALID_VOICES.has(voice) ? voice : 'Puck';
        let secondaryVoice = VALID_VOICES.has(secondVoice) ? secondVoice : 'Kore';
        if (secondaryVoice === primaryVoice) {
          secondaryVoice = primaryVoice === 'Kore' ? 'Puck' : 'Kore';
        }

        const parts = turns
          .filter((t: { text?: string }) => typeof t?.text === 'string' && t.text.trim().length > 0)
          .map((t: { speaker?: string; text: string }) => {
            const speakerName = t.speaker === 'Pembicara 2' ? 'Pembicara 2' : 'Pembicara 1';
            const speakerStyle =
              speakerName === 'Pembicara 2'
                ? secondStyle || 'Tenang, jelas, dan komunikatif'
                : style || 'Antusias, ramah, dan ekspresif';
            return {
              text: `${speakerName}: ${t.text.trim()}`,
              speechMetadata: {
                speaker: speakerName,
                style: speakerStyle,
              },
            };
          });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash-tts',
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: [
                  {
                    speaker: 'Pembicara 1',
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: primaryVoice },
                    },
                  },
                  {
                    speaker: 'Pembicara 2',
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: secondaryVoice },
                    },
                  },
                ],
              },
            },
          },
        });

        const base64Audio =
          response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
          res.status(502).json({
            error: 'Model tidak mengembalikan data audio. Coba sesuaikan teks dialog Anda.',
          });
          return;
        }

        res.json({
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          modelUsed: 'gemini-3.8-flash-tts',
        });
        return;
      }

      if (typeof text !== 'string' || !text.trim()) {
        res.status(400).json({ error: 'Teks naskah tidak boleh kosong.' });
        return;
      }

      const selectedVoice = VALID_VOICES.has(voice) ? voice : 'Kore';
      const targetModel =
        modelChoice === 'flash-hd'
          ? 'gemini-3.8-flash-tts'
          : 'gemini-3.8-flash-lite-tts';

      const part: { text: string; speechMetadata?: { style: string } } = {
        text: text.trim(),
      };
      if (typeof style === 'string' && style.trim()) {
        part.speechMetadata = { style: style.trim() };
      }

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [
          {
            role: 'user',
            parts: [part],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: 'Model tidak mengembalikan data audio. Silakan coba lagi.',
        });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        modelUsed: targetModel,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  /**
   * POST /api/transcribe
   * Uses gemini-3.5-transcribe to transcribe user microphone or uploaded audio
   */
  app.post('/api/transcribe', async (req: Request, res: Response) => {
    try {
      const { audioBase64, mimeType = 'audio/webm' } = req.body ?? {};

      if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
        res.status(400).json({ error: 'Data rekaman audio tidak ditemukan.' });
        return;
      }

      const cleanBase64 = audioBase64.includes(',')
        ? audioBase64.split(',')[1]
        : audioBase64;

      const normalizedMime = mimeType.split(';')[0].trim() || 'audio/webm';

      const ai = getGenAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe this audio accurately. Preserve proper punctuation and capitalization in the spoken language.',
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      res.json({
        transcript,
        modelUsed: 'gemini-3.5-transcribe',
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  /**
   * POST /api/dub
   * ElevenLabs-style AI Dubbing & Speech-to-Speech Translation:
   * 1. Transcribe source audio if provided (using gemini-3.5-transcribe)
   * 2. Translate & adapt timing/phrasing into targetLanguage (using gemini-3.8-flash)
   * 3. Synthesize dubbed WAV audio in selected voice & style (using gemini-3.8-flash-tts)
   */
  app.post('/api/dub', async (req: Request, res: Response) => {
    try {
      const {
        sourceText = '',
        audioBase64 = '',
        mimeType = 'audio/webm',
        targetLanguage = 'English',
        voice = 'Kore',
        style = 'Natural, expressive dubbing voice matching original speaker emotion',
      } = req.body ?? {};

      const ai = getGenAIClient();
      let originalTranscript = typeof sourceText === 'string' ? sourceText.trim() : '';

      if (!originalTranscript && typeof audioBase64 === 'string' && audioBase64.trim()) {
        const cleanBase64 = audioBase64.includes(',')
          ? audioBase64.split(',')[1]
          : audioBase64;
        const normalizedMime = mimeType.split(';')[0].trim() || 'audio/webm';

        const sttRes = await ai.models.generateContent({
          model: 'gemini-3.5-transcribe',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'Transcribe this audio accurately in its original spoken language.',
              },
            ],
          },
        });
        originalTranscript = (sttRes.text ?? '').trim();
      }

      if (!originalTranscript) {
        res.status(400).json({
          error: 'Masukkan teks sumber atau rekam audio terlebih dahulu untuk proses dubbing.',
        });
        return;
      }

      const translationRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Translate and adapt the following spoken script naturally for voiceover dubbing into ${targetLanguage}. Keep the spoken length, tone, and emotional cadence natural for a voice actor. Return ONLY the translated spoken text without quotes or commentary:\n\n${originalTranscript}`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const translatedText = (translationRes.text ?? '').trim();
      if (!translatedText) {
        res.status(502).json({
          error: 'Gagal menerjemahkan naskah dubbing.',
        });
        return;
      }

      const selectedVoice = VALID_VOICES.has(voice) ? voice : 'Kore';
      const ttsRes = await ai.models.generateContent({
        model: 'gemini-3.8-flash-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: translatedText,
                speechMetadata: {
                  style: style || `Natural ${targetLanguage} dubbing actor`,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const dubbedAudioBase64 =
        ttsRes.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!dubbedAudioBase64) {
        res.status(502).json({
          error: 'Gagal menghasilkan audio dubbing.',
        });
        return;
      }

      res.json({
        originalTranscript,
        translatedText,
        targetLanguage,
        audioBase64: dubbedAudioBase64,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
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

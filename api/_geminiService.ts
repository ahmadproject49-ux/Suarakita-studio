import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export const VALID_VOICES = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);

export interface ApiResult {
  status: number;
  body: Record<string, unknown>;
}

export function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY belum tersedia di lingkungan server. Pastikan variabel GEMINI_API_KEY sudah diatur.'
    );
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

export function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('403')
  ) {
    return {
      status: 403,
      message:
        'Kunci API tidak valid atau tidak memiliki izin. Silakan periksa GEMINI_API_KEY Anda.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message: 'Batas kuota API tercapai. Silakan coba beberapa saat lagi atau tingkatkan kuota API.',
    };
  }
  return {
    status: 500,
    message: raw || 'Terjadi kesalahan saat memproses permintaan audio.',
  };
}

export async function handleTtsPayload(payload: Record<string, unknown>): Promise<ApiResult> {
  try {
    const mode = payload?.mode === 'dialogue' ? 'dialogue' : 'single';
    const modelChoice = payload?.modelChoice === 'flash-hd' ? 'flash-hd' : 'flash-lite';
    const text = typeof payload?.text === 'string' ? payload.text : '';
    const voice = typeof payload?.voice === 'string' ? payload.voice : 'Kore';
    const style = typeof payload?.style === 'string' ? payload.style : '';
    const secondVoice =
      typeof payload?.secondVoice === 'string' ? payload.secondVoice : 'Puck';
    const secondStyle =
      typeof payload?.secondStyle === 'string' ? payload.secondStyle : '';
    const turns = Array.isArray(payload?.turns) ? payload.turns : [];

    const ai = getGenAIClient();

    if (mode === 'dialogue') {
      if (turns.length < 2) {
        return {
          status: 400,
          body: { error: 'Mode dialog membutuhkan minimal 2 baris percakapan.' },
        };
      }

      const primaryVoice = VALID_VOICES.has(voice) ? voice : 'Puck';
      let secondaryVoice = VALID_VOICES.has(secondVoice) ? secondVoice : 'Kore';
      if (secondaryVoice === primaryVoice) {
        secondaryVoice = primaryVoice === 'Kore' ? 'Puck' : 'Kore';
      }

      const parts = turns
        .filter(
          (t: { text?: string }) => typeof t?.text === 'string' && t.text.trim().length > 0
        )
        .map((t: { speaker?: string; text: string }) => {
          const speakerName =
            t.speaker === 'Pembicara 2' ? 'Pembicara 2' : 'Pembicara 1';
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
        contents: [{ role: 'user', parts }],
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
        return {
          status: 502,
          body: {
            error: 'Model tidak mengembalikan data audio. Coba sesuaikan teks dialog Anda.',
          },
        };
      }

      return {
        status: 200,
        body: {
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
          modelUsed: 'gemini-3.8-flash-tts',
        },
      };
    }

    if (!text.trim()) {
      return {
        status: 400,
        body: { error: 'Teks naskah tidak boleh kosong.' },
      };
    }

    const selectedVoice = VALID_VOICES.has(voice) ? voice : 'Kore';
    const targetModel =
      modelChoice === 'flash-hd'
        ? 'gemini-3.8-flash-tts'
        : 'gemini-3.8-flash-lite-tts';

    const part: { text: string; speechMetadata?: { style: string } } = {
      text: text.trim(),
    };
    if (style.trim()) {
      part.speechMetadata = { style: style.trim() };
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: [{ role: 'user', parts: [part] }],
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
      return {
        status: 502,
        body: { error: 'Model tidak mengembalikan data audio. Silakan coba lagi.' },
      };
    }

    return {
      status: 200,
      body: {
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
        modelUsed: targetModel,
      },
    };
  } catch (err) {
    const formatted = formatGeminiError(err);
    return { status: formatted.status, body: { error: formatted.message } };
  }
}

export async function handleTranscribePayload(
  payload: Record<string, unknown>
): Promise<ApiResult> {
  try {
    const audioBase64 =
      typeof payload?.audioBase64 === 'string' ? payload.audioBase64 : '';
    const mimeType =
      typeof payload?.mimeType === 'string' ? payload.mimeType : 'audio/webm';

    if (!audioBase64.trim()) {
      return {
        status: 400,
        body: { error: 'Data rekaman audio tidak ditemukan.' },
      };
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
    return {
      status: 200,
      body: {
        transcript,
        modelUsed: 'gemini-3.5-transcribe',
      },
    };
  } catch (err) {
    const formatted = formatGeminiError(err);
    return { status: formatted.status, body: { error: formatted.message } };
  }
}

export async function handleDubPayload(
  payload: Record<string, unknown>
): Promise<ApiResult> {
  try {
    const sourceText =
      typeof payload?.sourceText === 'string' ? payload.sourceText : '';
    const audioBase64 =
      typeof payload?.audioBase64 === 'string' ? payload.audioBase64 : '';
    const mimeType =
      typeof payload?.mimeType === 'string' ? payload.mimeType : 'audio/webm';
    const targetLanguage =
      typeof payload?.targetLanguage === 'string'
        ? payload.targetLanguage
        : 'English';
    const voice = typeof payload?.voice === 'string' ? payload.voice : 'Kore';
    const style =
      typeof payload?.style === 'string'
        ? payload.style
        : 'Natural, expressive dubbing voice matching original speaker emotion';

    const ai = getGenAIClient();
    let originalTranscript = sourceText.trim();

    if (!originalTranscript && audioBase64.trim()) {
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
      return {
        status: 400,
        body: {
          error:
            'Masukkan teks sumber atau rekam audio terlebih dahulu untuk proses dubbing.',
        },
      };
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
      return {
        status: 502,
        body: { error: 'Gagal menerjemahkan naskah dubbing.' },
      };
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
      return {
        status: 502,
        body: { error: 'Gagal menghasilkan audio dubbing.' },
      };
    }

    return {
      status: 200,
      body: {
        originalTranscript,
        translatedText,
        targetLanguage,
        audioBase64: dubbedAudioBase64,
        mimeType: 'audio/wav',
      },
    };
  } catch (err) {
    const formatted = formatGeminiError(err);
    return { status: formatted.status, body: { error: formatted.message } };
  }
}

export type VoiceName = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';

export type TtsMode = 'single' | 'dialogue';

export type ModelChoice = 'flash-lite' | 'flash-hd';

export interface VoiceSliders {
  stability: number; // 0 - 100
  similarity: number; // 0 - 100
  styleExaggeration: number; // 0 - 100
  speed: number; // 0.7 - 1.3
  speakerBoost: boolean;
}

export interface VoicePersona {
  id: string;
  name: string;
  baseVoice: VoiceName;
  accent: string;
  gender: 'Wanita' | 'Pria' | 'Netral';
  ageGroup: 'Muda' | 'Dewasa' | 'Senior';
  useCase: 'Narasi' | 'Podcast' | 'Berita' | 'Karakter' | 'Layanan';
  tagline: string;
  defaultStylePrompt: string;
  previewFreq: number;
  isCustom?: boolean;
}

export interface DialogueTurn {
  id: string;
  speaker: 'Pembicara 1' | 'Pembicara 2';
  text: string;
}

export interface StudioChapter {
  id: string;
  title: string;
  personaId: string;
  text: string;
  audioUrl?: string;
  durationSec?: number;
  status: 'idle' | 'generating' | 'ready' | 'error';
}

export interface PresetTemplate {
  id: string;
  title: string;
  category: string;
  mode: TtsMode;
  personaId: string;
  secondPersonaId?: string;
  text: string;
  dialogueTurns?: DialogueTurn[];
}

export interface AudioHistoryItem {
  id: string;
  title: string;
  mode: TtsMode;
  modelLabel: string;
  voiceSummary: string;
  textPreview: string;
  createdAt: string;
  durationSec: number;
  audioUrl: string;
  base64Audio?: string;
  playbackSpeed?: number;
  isSample?: boolean;
}

export const DEFAULT_SLIDERS: VoiceSliders = {
  stability: 55,
  similarity: 78,
  styleExaggeration: 30,
  speed: 1.0,
  speakerBoost: true,
};

export const INITIAL_VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'kore-news',
    name: 'Kore — Jurnalis Utama',
    baseVoice: 'Kore',
    accent: 'Indonesia Baku',
    gender: 'Wanita',
    ageGroup: 'Dewasa',
    useCase: 'Berita',
    tagline: 'Jernih, artikulatif, dan objektif untuk siaran berita & dokumenter',
    defaultStylePrompt: 'Pembawa berita profesional, artikulasi sangat jernih, tempo terukur',
    previewFreq: 440,
  },
  {
    id: 'puck-creator',
    name: 'Puck — Kreator & Host',
    baseVoice: 'Puck',
    accent: 'Indonesia Kasual',
    gender: 'Pria',
    ageGroup: 'Muda',
    useCase: 'Podcast',
    tagline: 'Ceria, ekspresif, dan akrab untuk konten kreator, iklan, & obrolan',
    defaultStylePrompt: 'Host podcast muda yang antusias, ramah, ekspresif, dan natural',
    previewFreq: 523.25,
  },
  {
    id: 'zephyr-concierge',
    name: 'Zephyr — Layanan Eksekutif',
    baseVoice: 'Zephyr',
    accent: 'Indonesia Halus',
    gender: 'Wanita',
    ageGroup: 'Dewasa',
    useCase: 'Layanan',
    tagline: 'Hangat, menenangkan, dan empatik untuk asisten pelanggan & panduan',
    defaultStylePrompt: 'Suara hangat, penuh empati, sopan, dan menenangkan pendengar',
    previewFreq: 392,
  },
  {
    id: 'charon-narrator',
    name: 'Charon — Narator Sinematik',
    baseVoice: 'Charon',
    accent: 'Indonesia Klasik',
    gender: 'Pria',
    ageGroup: 'Senior',
    useCase: 'Narasi',
    tagline: 'Dalam, berwibawa, dan dramatis untuk buku audio & film dokumenter',
    defaultStylePrompt: 'Narator buku audio sinematik, suara bariton tenang dan penuh penghayatan',
    previewFreq: 329.63,
  },
  {
    id: 'fenrir-dynamic',
    name: 'Fenrir — Instruktur Tegas',
    baseVoice: 'Fenrir',
    accent: 'Internasional / Tegas',
    gender: 'Pria',
    ageGroup: 'Dewasa',
    useCase: 'Karakter',
    tagline: 'Enerjik, kuat, dan tajam untuk trailer gim, olahraga, & pengumuman',
    defaultStylePrompt: 'Tegas, penuh energi, fokus tinggi, dan meyakinkan',
    previewFreq: 293.66,
  },
  {
    id: 'kore-english',
    name: 'Clara — Global Storyteller',
    baseVoice: 'Kore',
    accent: 'English Neutral',
    gender: 'Wanita',
    ageGroup: 'Muda',
    useCase: 'Narasi',
    tagline: 'Articulate bilingual voice for global product launches & explainers',
    defaultStylePrompt: 'Warm, articulate global narrator with crisp diction and natural pacing',
    previewFreq: 493.88,
  },
];

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'news-id',
    title: 'Ringkasan Berita Pagi',
    category: 'Jurnalistik',
    mode: 'single',
    personaId: 'kore-news',
    text: 'Selamat pagi pemirsa. Memasuki pekan pertama bulan November, inovasi teknologi sintesis suara generasi terbaru mempermudah kreator dan rumah produksi menghasilkan narasi berkualitas studio dalam hitungan detik.',
  },
  {
    id: 'audiobook-story',
    title: 'Bab 1: Kabut di Atas Bromo',
    category: 'Buku Audio',
    mode: 'single',
    personaId: 'charon-narrator',
    text: 'Kabut tipis masih menyelimuti lereng Gunung Bromo ketika cahaya keemasan pertama menembus cakrawala. <breath> Di kejauhan, derap langkah kuda terdengar pelan menyusuri lautan pasir yang sunyi.',
  },
  {
    id: 'ivr-cs',
    title: 'Asisten Layanan Pelanggan',
    category: 'Bisnis & IVR',
    mode: 'single',
    personaId: 'zephyr-concierge',
    text: 'Halo, selamat datang di Layanan Prioritas Nusantara. Untuk memeriksa jadwal penerbangan atau mengubah kursi Anda, silakan sebutkan kode pemesanan enam digit setelah tanda berikut.',
  },
  {
    id: 'podcast-duo',
    title: 'Episode 14: Masa Depan Audio Kreator',
    category: 'Podcast 2 Host',
    mode: 'dialogue',
    personaId: 'puck-creator',
    secondPersonaId: 'kore-news',
    text: '',
    dialogueTurns: [
      {
        id: 'turn-1',
        speaker: 'Pembicara 1',
        text: 'Halo semuanya, balik lagi di Obrolan Sore! <breath> Hari ini kita bakal bahas gimana caranya bikin produksi buku audio dan podcast tanpa harus sewa studio kedap suara.',
      },
      {
        id: 'turn-2',
        speaker: 'Pembicara 2',
        text: 'Betul banget! |yeah| Sekarang kita bahkan bisa mengatur stabilitas intonasi, gaya ekspresi, sampai menggabungkan beberapa bab naskah sekaligus.',
      },
      {
        id: 'turn-3',
        speaker: 'Pembicara 1',
        text: 'Wah gila sih, <laugh> ini ngebantu banget buat kreator independen yang dikejar tenggat waktu.',
      },
    ],
  },
];

export const DUBBING_LANGUAGES = [
  { code: 'English', label: 'Bahasa Inggris (English)' },
  { code: 'Indonesian', label: 'Bahasa Indonesia' },
  { code: 'Japanese', label: 'Bahasa Jepang (日本語)' },
  { code: 'Korean', label: 'Bahasa Korea (한국어)' },
  { code: 'Spanish', label: 'Bahasa Spanyol (Español)' },
  { code: 'Arabic', label: 'Bahasa Arab (العربية)' },
  { code: 'French', label: 'Bahasa Prancis (Français)' },
  { code: 'German', label: 'Bahasa Jerman (Deutsch)' },
];

/**
 * Translates ElevenLabs-like acoustic sliders + base persona prompt into rich Gemini TTS speechMetadata style direction.
 */
export function buildStyleDirective(
  basePrompt: string,
  sliders: VoiceSliders
): string {
  const directives: string[] = [];
  if (basePrompt.trim()) {
    directives.push(basePrompt.trim());
  }

  if (sliders.stability >= 75) {
    directives.push('consistent, steady cadence with minimal pitch fluctuation');
  } else if (sliders.stability <= 35) {
    directives.push('highly dynamic, spontaneous emotional inflection and varied rhythm');
  } else {
    directives.push('balanced natural conversational flow');
  }

  if (sliders.styleExaggeration >= 65) {
    directives.push('expressive theatrical delivery with vivid emotional emphasis');
  } else if (sliders.styleExaggeration <= 20) {
    directives.push('neutral, restrained, understated tone');
  }

  if (sliders.speed >= 1.15) {
    directives.push('brisk, energetic speaking pace');
  } else if (sliders.speed <= 0.88) {
    directives.push('slow, deliberate, measured speaking pace');
  }

  if (sliders.speakerBoost) {
    directives.push('close-mic studio broadcast presence and crisp consonant clarity');
  }

  return directives.join(', ');
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateSpeechSeconds(text: string, speed = 1.0): number {
  const words = countWords(text);
  if (words === 0) return 0;
  const safeSpeed = Math.max(0.5, Math.min(2.0, speed));
  return Math.max(1, Math.round(((words / 135) * 60) / safeSpeed));
}

export function formatDuration(seconds: number): string {
  const safeSec = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function validateTtsInput(
  mode: TtsMode,
  singleText: string,
  turns: DialogueTurn[]
): { valid: boolean; error?: string } {
  if (mode === 'single') {
    const trimmed = singleText.trim();
    if (!trimmed) {
      return {
        valid: false,
        error: 'Silakan masukkan teks naskah terlebih dahulu sebelum menghasilkan suara.',
      };
    }
    if (trimmed.length > 5000) {
      return {
        valid: false,
        error: 'Teks melebihi batas 5.000 karakter per pembuatan. Gunakan tab Studio Multi-Bab untuk naskah panjang.',
      };
    }
    return { valid: true };
  }

  const nonEmptyTurns = turns.filter((t) => t.text.trim().length > 0);
  if (nonEmptyTurns.length < 2) {
    return {
      valid: false,
      error: 'Mode dialog membutuhkan minimal 2 baris percakapan yang terisi.',
    };
  }
  const hasSpeaker1 = nonEmptyTurns.some((t) => t.speaker === 'Pembicara 1');
  const hasSpeaker2 = nonEmptyTurns.some((t) => t.speaker === 'Pembicara 2');
  if (!hasSpeaker1 || !hasSpeaker2) {
    return {
      valid: false,
      error:
        'Pastikan kedua pembicara (Pembicara 1 dan Pembicara 2) memiliki minimal satu dialog.',
    };
  }
  return { valid: true };
}

/**
 * Generates deterministic waveform bar heights (0.18 - 1.0) from a string seed
 * so the bottom audio player displays a crisp studio waveform scrubber.
 */
export function generateWaveformBars(seed: string, barCount = 56): number[] {
  let hash = 2166136261;
  const input = seed || 'suarakita-waveform';
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const bars: number[] = [];
  for (let i = 0; i < barCount; i++) {
    hash ^= i * 374761393;
    hash = Math.imul(hash, 668265263);
    const normalized = ((hash >>> 0) % 1000) / 1000;
    const envelope = Math.sin((i / (barCount - 1)) * Math.PI) * 0.35 + 0.65;
    const height = Math.max(0.18, Math.min(1, (0.25 + normalized * 0.75) * envelope));
    bars.push(Number(height.toFixed(3)));
  }
  return bars;
}

/**
 * Concatenates multiple 24kHz 16-bit mono WAV Data URIs into a single continuous WAV Data URI
 * by stripping the 44-byte RIFF header from each clip and writing a unified RIFF header.
 */
export function concatenateWavDataUris(dataUris: string[]): string | null {
  const pcmArrays: Uint8Array[] = [];
  let totalDataBytes = 0;

  for (const uri of dataUris) {
    const base64 = uri.includes(',') ? uri.split(',')[1] : uri;
    if (!base64) continue;

    let bytes: Uint8Array;
    if (typeof atob === 'function') {
      const bin = atob(base64);
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
    } else {
      bytes = new Uint8Array(Buffer.from(base64, 'base64'));
    }

    if (bytes.byteLength <= 44) continue;
    const pcmBody = bytes.subarray(44);
    pcmArrays.push(pcmBody);
    totalDataBytes += pcmBody.byteLength;
  }

  if (pcmArrays.length === 0 || totalDataBytes === 0) return null;

  const sampleRate = 24000;
  const outBuffer = new ArrayBuffer(44 + totalDataBytes);
  const view = new DataView(outBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + totalDataBytes, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, totalDataBytes, true);

  const outBytes = new Uint8Array(outBuffer);
  let offset = 44;
  for (const pcm of pcmArrays) {
    outBytes.set(pcm, offset);
    offset += pcm.byteLength;
  }

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < outBytes.length; i += chunkSize) {
    const slice = outBytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(outBuffer).toString('base64');

  return `data:audio/wav;base64,${b64}`;
}

export function createSynthesizedDemoWavDataUri(
  durationSec = 2.2,
  baseFreq = 440
): string {
  const sampleRate = 24000;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.06) * Math.exp(-t * 1.45);
    const wave =
      0.5 * Math.sin(2 * Math.PI * baseFreq * t) +
      0.3 * Math.sin(2 * Math.PI * (baseFreq * 1.25) * t) +
      0.2 * Math.sin(2 * Math.PI * (baseFreq * 1.5) * t);
    const sample = Math.max(-1, Math.min(1, wave * envelope * 0.45));
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(buffer).toString('base64');
  return `data:audio/wav;base64,${b64}`;
}

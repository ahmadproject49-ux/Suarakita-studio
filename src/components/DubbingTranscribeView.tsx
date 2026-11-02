import React, { useState } from 'react';
import { Globe, Loader2, Mic, Volume2 } from 'lucide-react';
import {
  AudioHistoryItem,
  buildStyleDirective,
  DUBBING_LANGUAGES,
  estimateSpeechSeconds,
  VoicePersona,
  VoiceSliders,
} from '../utils/audioHelpers';
import { MicrophoneTranscriber } from './MicrophoneTranscriber';
import { postApiJson } from '../utils/apiClient';

interface DubbingTranscribeViewProps {
  personas: VoicePersona[];
  selectedPersonaId: string;
  sliders: VoiceSliders;
  onInsertToTts: (transcript: string, autoSynthesize?: boolean) => void;
  onPublishDubbedTrack: (track: AudioHistoryItem) => void;
}

export const DubbingTranscribeView: React.FC<DubbingTranscribeViewProps> = ({
  personas,
  selectedPersonaId,
  sliders,
  onInsertToTts,
  onPublishDubbedTrack,
}) => {
  const [subMode, setSubMode] = useState<'scribe' | 'dubbing'>('scribe');
  const [sourceScript, setSourceScript] = useState(
    'Halo semuanya! Selamat datang di saluran kami. Hari ini kita akan mempelajari cara menerjemahkan dan mengisi suara video ke berbagai bahasa dunia secara otomatis.'
  );
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [dubPersonaId, setDubPersonaId] = useState(selectedPersonaId);
  const [translatedResult, setTranslatedResult] = useState('');
  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [isDubbing, setIsDubbing] = useState(false);
  const [dubError, setDubError] = useState<string | null>(null);

  const handleGenerateDubbing = async () => {
    if (!sourceScript.trim()) {
      setDubError('Masukkan teks sumber yang ingin di-dubbing terlebih dahulu.');
      return;
    }

    setDubError(null);
    setIsDubbing(true);

    try {
      const persona =
        personas.find((p) => p.id === dubPersonaId) || personas[0];
      const style = buildStyleDirective(persona.defaultStylePrompt, sliders);

      const data = await postApiJson<{
        translatedText: string;
        audioBase64: string;
      }>('/api/dub', {
        sourceText: sourceScript.trim(),
        targetLanguage,
        voice: persona.baseVoice,
        style,
      });

      setTranslatedResult(data.translatedText);
      const wavUri = `data:audio/wav;base64,${data.audioBase64}`;
      setDubbedAudioUrl(wavUri);

      onPublishDubbedTrack({
        id: `dub-${Date.now()}`,
        title: `Dubbing ${targetLanguage} — ${persona.name}`,
        mode: 'single',
        modelLabel: `AI Dubbing (${targetLanguage})`,
        voiceSummary: persona.name,
        textPreview: data.translatedText.slice(0, 140),
        createdAt: 'Baru saja',
        durationSec: estimateSpeechSeconds(data.translatedText, sliders.speed),
        audioUrl: wavUri,
        playbackSpeed: sliders.speed,
      });
    } catch (err) {
      setDubError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat proses dubbing.'
      );
    } finally {
      setIsDubbing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-mode Segmented Switcher: Scribe (STT) vs AI Dubbing */}
      <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/75 rounded-lg">
        <button
          type="button"
          onClick={() => setSubMode('scribe')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            subMode === 'scribe'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Scribe (Speech to Text)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('dubbing')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
            subMode === 'dubbing'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>AI Dubbing Lintas Bahasa</span>
        </button>
      </div>

      {subMode === 'scribe' ? (
        <MicrophoneTranscriber
          onInsertToTts={(transcript, autoSynthesize) => {
            setSourceScript(transcript);
            onInsertToTts(transcript, autoSynthesize);
          }}
        />
      ) : (
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              AI Dubbing &amp; Lokalisasi Suara Otomatis
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Terjemahkan naskah atau hasil transkripsi mikrofon Anda ke bahasa tujuan dengan adaptasi ritme sulih suara alami.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="dub-target-lang"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Bahasa Tujuan Dubbing
              </label>
              <select
                id="dub-target-lang"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                {DUBBING_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="dub-voice-persona"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Aktor Suara Dubbing
              </label>
              <select
                id="dub-voice-persona"
                value={dubPersonaId}
                onChange={(e) => setDubPersonaId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="dub-source-script"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              Naskah Asli (Bahasa Sumber)
            </label>
            <textarea
              id="dub-source-script"
              rows={4}
              value={sourceScript}
              onChange={(e) => setSourceScript(e.target.value)}
              placeholder="Masukkan teks asli atau rekam melalui tab Scribe terlebih dahulu..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none leading-relaxed"
            />
          </div>

          {dubError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {dubError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleGenerateDubbing()}
              disabled={isDubbing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isDubbing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menerjemahkan &amp; Mensintesis Suara...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  <span>Buat Audio Dubbing ({targetLanguage})</span>
                </>
              )}
            </button>
          </div>

          {translatedResult && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div>
                <span className="block text-xs font-medium text-slate-500 mb-1">
                  Hasil Adaptasi Naskah ({targetLanguage})
                </span>
                <p className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 leading-relaxed">
                  {translatedResult}
                </p>
              </div>
              {dubbedAudioUrl && (
                <audio controls src={dubbedAudioUrl} className="w-full h-9" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

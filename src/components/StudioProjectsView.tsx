import React, { useState } from 'react';
import {
  Check,
  Download,
  Layers,
  Loader2,
  Play,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  AudioHistoryItem,
  buildStyleDirective,
  concatenateWavDataUris,
  countWords,
  estimateSpeechSeconds,
  formatDuration,
  StudioChapter,
  VoicePersona,
  VoiceSliders,
} from '../utils/audioHelpers';
import { postApiJson } from '../utils/apiClient';

interface StudioProjectsViewProps {
  personas: VoicePersona[];
  sliders: VoiceSliders;
  onPublishTrack: (track: AudioHistoryItem) => void;
}

const INITIAL_CHAPTERS: StudioChapter[] = [
  {
    id: 'chap-1',
    title: 'Bab 1 — Pembukaan Dokumenter',
    personaId: 'charon-narrator',
    text: 'Nusantara menyimpan lebih dari tujuh belas ribu pulau yang membentang di garis khatulistiwa, masing-masing memiliki kisah peradaban dan kekayaan hayati yang tiada duanya.',
    status: 'idle',
  },
  {
    id: 'chap-2',
    title: 'Bab 2 — Perspektif Peneliti Lapangan',
    personaId: 'kore-news',
    text: 'Dalam ekspedisi tahun ini, tim riset berhasil memetakan ekosistem terumbu karang laut dalam menggunakan sensor akustik berpresisi tinggi.',
    status: 'idle',
  },
];

export const StudioProjectsView: React.FC<StudioProjectsViewProps> = ({
  personas,
  sliders,
  onPublishTrack,
}) => {
  const [projectTitle, setProjectTitle] = useState(
    'Buku Audio: Ekspedisi Laut Nusantara'
  );
  const [chapters, setChapters] = useState<StudioChapter[]>(INITIAL_CHAPTERS);
  const [isRenderingAll, setIsRenderingAll] = useState(false);
  const [mergedAudioUrl, setMergedAudioUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalWords = chapters.reduce((acc, c) => acc + countWords(c.text), 0);
  const totalEstSec = chapters.reduce(
    (acc, c) => acc + estimateSpeechSeconds(c.text, sliders.speed),
    0
  );

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    setChapters((prev) => [
      ...prev,
      {
        id: `chap-${Date.now()}`,
        title: `Bab ${nextNum} — Bagian Baru`,
        personaId: personas[0]?.id || 'kore-news',
        text: '',
        status: 'idle',
      },
    ]);
    setMergedAudioUrl(null);
  };

  const handleUpdateChapter = (
    id: string,
    patch: Partial<StudioChapter>
  ) => {
    setChapters((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...patch,
              status: patch.text !== undefined || patch.personaId !== undefined ? 'idle' : c.status,
            }
          : c
      )
    );
    if (patch.text !== undefined || patch.personaId !== undefined) {
      setMergedAudioUrl(null);
    }
  };

  const handleRemoveChapter = (id: string) => {
    if (chapters.length <= 1) return;
    setChapters((prev) => prev.filter((c) => c.id !== id));
    setMergedAudioUrl(null);
  };

  const synthesizeSingleChapter = async (
    chapter: StudioChapter
  ): Promise<string | null> => {
    if (!chapter.text.trim()) {
      throw new Error(`Teks pada "${chapter.title}" masih kosong.`);
    }

    const persona =
      personas.find((p) => p.id === chapter.personaId) || personas[0];
    const style = buildStyleDirective(persona.defaultStylePrompt, sliders);

    setChapters((prev) =>
      prev.map((c) => (c.id === chapter.id ? { ...c, status: 'generating' } : c))
    );

    try {
      const data = await postApiJson<{ audioBase64: string }>('/api/tts', {
        mode: 'single',
        modelChoice: 'flash-lite',
        text: chapter.text.trim(),
        voice: persona.baseVoice,
        style,
      });

      const audioUri = `data:audio/wav;base64,${data.audioBase64}`;
      const dur = estimateSpeechSeconds(chapter.text, sliders.speed);

      setChapters((prev) =>
        prev.map((c) =>
          c.id === chapter.id
            ? { ...c, audioUrl: audioUri, durationSec: dur, status: 'ready' }
            : c
        )
      );
      return audioUri;
    } catch (err) {
      setChapters((prev) =>
        prev.map((c) => (c.id === chapter.id ? { ...c, status: 'error' } : c))
      );
      throw err;
    }
  };

  const handleRenderChapterClick = async (chapter: StudioChapter) => {
    setErrorMsg(null);
    try {
      const uri = await synthesizeSingleChapter(chapter);
      if (uri) {
        const persona =
          personas.find((p) => p.id === chapter.personaId) || personas[0];
        onPublishTrack({
          id: `chap-audio-${Date.now()}`,
          title: `${projectTitle} · ${chapter.title}`,
          mode: 'single',
          modelLabel: 'Studio Multi-Bab',
          voiceSummary: persona.name,
          textPreview: chapter.text.slice(0, 140),
          createdAt: 'Baru saja',
          durationSec: estimateSpeechSeconds(chapter.text, sliders.speed),
          audioUrl: uri,
          playbackSpeed: sliders.speed,
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat audio bab.');
    }
  };

  const handleRenderAndMergeAll = async () => {
    setErrorMsg(null);
    const emptyChap = chapters.find((c) => !c.text.trim());
    if (emptyChap) {
      setErrorMsg(`Silakan isi naskah pada "${emptyChap.title}" terlebih dahulu.`);
      return;
    }

    setIsRenderingAll(true);
    try {
      const collectedUris: string[] = [];
      for (const chap of chapters) {
        if (chap.status === 'ready' && chap.audioUrl) {
          collectedUris.push(chap.audioUrl);
        } else {
          const uri = await synthesizeSingleChapter(chap);
          if (uri) collectedUris.push(uri);
        }
      }

      const combinedWav = concatenateWavDataUris(collectedUris);
      if (!combinedWav) {
        throw new Error('Gagal menggabungkan berkas WAV seluruh bab.');
      }

      setMergedAudioUrl(combinedWav);
      onPublishTrack({
        id: `project-master-${Date.now()}`,
        title: `${projectTitle} (Master Gabungan ${chapters.length} Bab)`,
        mode: 'single',
        modelLabel: 'Master Multi-Bab WAV',
        voiceSummary: `${chapters.length} Segmen Suara`,
        textPreview: chapters.map((c) => c.title).join(' · '),
        createdAt: 'Baru saja',
        durationSec: totalEstSec,
        audioUrl: combinedWav,
        playbackSpeed: sliders.speed,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat merender proyek.'
      );
    } finally {
      setIsRenderingAll(false);
    }
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1 flex-1">
          <label
            htmlFor="studio-project-title"
            className="block text-xs font-medium text-slate-500"
          >
            Studio Proyek Panjang (Audiobook &amp; Naskah Multi-Bab)
          </label>
          <input
            id="studio-project-title"
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full max-w-xl text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none py-0.5"
          />
          <p className="text-xs text-slate-500 font-mono-tabular">
            {chapters.length} bab · {totalWords} kata · Estimasi total ~{formatDuration(totalEstSec)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleAddChapter}
            disabled={isRenderingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Bab</span>
          </button>

          <button
            type="button"
            onClick={() => void handleRenderAndMergeAll()}
            disabled={isRenderingAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {isRenderingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Merender Seluruh Bab...</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                <span>Render &amp; Gabungkan Master WAV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {mergedAudioUrl && (
        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-indigo-950">
            <Check className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Master Audio Selesai!</strong> Seluruh {chapters.length} bab telah digabung menjadi satu berkas WAV utuh dan dimuat ke pemutar bawah.
            </span>
          </div>
          <a
            href={mergedAudioUrl}
            download={`${projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-master.wav`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Master WAV</span>
          </a>
        </div>
      )}

      <div className="divide-y divide-slate-200">
        {chapters.map((chapter, index) => {
          const chapWords = countWords(chapter.text);
          return (
            <div
              key={chapter.id}
              className="py-5 first:pt-1 last:pb-1 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-xs font-semibold font-mono-tabular text-slate-400 shrink-0">
                    0{index + 1}.
                  </span>
                  <input
                    type="text"
                    aria-label={`Judul bab ${index + 1}`}
                    value={chapter.title}
                    onChange={(e) =>
                      handleUpdateChapter(chapter.id, { title: e.target.value })
                    }
                    className="flex-1 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-md px-2.5 py-1 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    aria-label={`Suara narator bab ${index + 1}`}
                    value={chapter.personaId}
                    onChange={(e) =>
                      handleUpdateChapter(chapter.id, { personaId: e.target.value })
                    }
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none"
                  >
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleRenderChapterClick(chapter)}
                    disabled={chapter.status === 'generating' || isRenderingAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {chapter.status === 'generating' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Merender...</span>
                      </>
                    ) : chapter.status === 'ready' ? (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Render Ulang</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Render Bab</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveChapter(chapter.id)}
                    disabled={chapters.length <= 1 || isRenderingAll}
                    aria-label={`Hapus ${chapter.title}`}
                    className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                rows={3}
                aria-label={`Naskah ${chapter.title}`}
                value={chapter.text}
                onChange={(e) =>
                  handleUpdateChapter(chapter.id, { text: e.target.value })
                }
                placeholder="Tulis paragraf naskah untuk bab ini..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-mono-tabular">
                  {chapWords} kata · ~{formatDuration(estimateSpeechSeconds(chapter.text, sliders.speed))}
                </span>

                {chapter.audioUrl && (
                  <audio controls src={chapter.audioUrl} className="h-7 max-w-xs" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { Check, Loader2, Play, Plus, Search, Volume2 } from 'lucide-react';
import {
  createSynthesizedDemoWavDataUri,
  VoiceName,
  VoicePersona,
} from '../utils/audioHelpers';
import { postApiJson } from '../utils/apiClient';

interface VoiceLabViewProps {
  personas: VoicePersona[];
  selectedPersonaId: string;
  onUsePersonaInTts: (personaId: string) => void;
  onCreateCustomPersona: (
    persona: VoicePersona,
    previewAudioBase64?: string
  ) => void;
}

const BASE_VOICES: VoiceName[] = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];

export const VoiceLabView: React.FC<VoiceLabViewProps> = ({
  personas,
  selectedPersonaId,
  onUsePersonaInTts,
  onCreateCustomPersona,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Voice Design Form State
  const [customName, setCustomName] = useState('');
  const [customBaseVoice, setCustomBaseVoice] = useState<VoiceName>('Kore');
  const [customGender, setCustomGender] = useState<'Wanita' | 'Pria' | 'Netral'>('Wanita');
  const [customAccent, setCustomAccent] = useState('Indonesia Sinematik');
  const [customUseCase, setCustomUseCase] = useState<VoicePersona['useCase']>('Narasi');
  const [customPrompt, setCustomPrompt] = useState(
    'Suara narator dokumenter alam yang hangat, tenang, berwibawa, dengan jeda dramatis yang halus'
  );
  const [sampleScript, setSampleScript] = useState(
    'Di balik rimbunnya hutan hujan Kalimantan, kehidupan liar bergerak dalam harmoni yang telah terjaga selama ribuan tahun.'
  );
  const [isDesigning, setIsDesigning] = useState(false);
  const [designError, setDesignError] = useState<string | null>(null);
  const [designedPreviewUrl, setDesignedPreviewUrl] = useState<string | null>(null);
  const [designedBase64, setDesignedBase64] = useState<string | undefined>(undefined);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const categories = ['Semua', 'Narasi', 'Podcast', 'Berita', 'Karakter', 'Layanan'];

  const filteredPersonas = useMemo(() => {
    return personas.filter((p) => {
      const matchesCat =
        filterCategory === 'Semua' || p.useCase === filterCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.accent.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [personas, filterCategory, searchQuery]);

  const handlePlaySample = async (persona: VoicePersona) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const demoUri = createSynthesizedDemoWavDataUri(1.6, persona.previewFreq);
    const audio = new Audio(demoUri);
    previewAudioRef.current = audio;
    setPreviewingId(persona.id);
    audio.onended = () => setPreviewingId(null);
    try {
      await audio.play();
    } catch {
      setPreviewingId(null);
    }
  };

  const handleTestVoiceDesign = async () => {
    if (!customPrompt.trim() || !sampleScript.trim()) {
      setDesignError('Deskripsi karakter suara dan kalimat uji tidak boleh kosong.');
      return;
    }
    setDesignError(null);
    setIsDesigning(true);
    setSavedSuccess(false);

    try {
      const data = await postApiJson<{ audioBase64: string }>('/api/tts', {
        mode: 'single',
        modelChoice: 'flash-hd',
        text: sampleScript.trim(),
        voice: customBaseVoice,
        style: customPrompt.trim(),
      });
      setDesignedBase64(data.audioBase64);
      setDesignedPreviewUrl(`data:audio/wav;base64,${data.audioBase64}`);
    } catch (err) {
      setDesignError(
        err instanceof Error ? err.message : 'Gagal membuat sampel desain suara.'
      );
    } finally {
      setIsDesigning(false);
    }
  };

  const handleSaveCustomVoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      setDesignError('Berikan nama untuk karakter suara baru Anda.');
      return;
    }
    if (!customPrompt.trim()) {
      setDesignError('Deskripsi gaya bicara wajib diisi.');
      return;
    }
    setDesignError(null);

    const newPersona: VoicePersona = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      baseVoice: customBaseVoice,
      accent: customAccent.trim() || 'Kustom',
      gender: customGender,
      ageGroup: 'Dewasa',
      useCase: customUseCase,
      tagline: customPrompt.trim().slice(0, 95),
      defaultStylePrompt: customPrompt.trim(),
      previewFreq: 466.16,
      isCustom: true,
    };

    onCreateCustomPersona(newPersona, designedBase64);
    setSavedSuccess(true);
    setCustomName('');
    window.setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left 7 Cols: Voice Library Directory */}
      <div className="lg:col-span-7 space-y-5">
        <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Voice Library ({personas.length} Karakter)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Koleksi karakter vokal siap pakai maupun hasil rancangan kustom Anda di Voice Design.
              </p>
            </div>

            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Cari karakter suara"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau aksen..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Interactive Category Filter Bar */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filterCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Voice Cards List */}
          <div className="divide-y divide-slate-100">
            {filteredPersonas.map((persona) => {
              const isSelected = persona.id === selectedPersonaId;
              const isPreviewing = previewingId === persona.id;
              return (
                <div
                  key={persona.id}
                  className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => handlePlaySample(persona)}
                      aria-label={`Putar nada pratinjau ${persona.name}`}
                      className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0 mt-0.5 transition-colors"
                    >
                      {isPreviewing ? (
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Play className="w-3.5 h-3.5 ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <h3 className="text-sm font-semibold text-slate-900">
                          {persona.name}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {persona.gender} · {persona.accent} · {persona.useCase}
                          {persona.isCustom ? ' · Kustom' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {persona.tagline}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      type="button"
                      onClick={() => onUsePersonaInTts(persona.id)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isSelected ? 'Sedang Dipakai' : 'Gunakan di Studio'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Voice Design Lab (Prompt-to-Voice) */}
      <div className="lg:col-span-5">
        <form
          onSubmit={handleSaveCustomVoice}
          className="border border-slate-200 bg-white rounded-xl p-6 space-y-4"
        >
          <div className="border-b border-slate-100 pb-3.5">
            <h2 className="text-base font-semibold text-slate-900">
              Voice Design — Rancang Karakter Baru
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ciptakan identitas suara kustom dari deskripsi teks menggunakan mesin Expressive Studio HD.
            </p>
          </div>

          <div>
            <label
              htmlFor="voice-design-name"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Nama Karakter Suara Baru
            </label>
            <input
              id="voice-design-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Contoh: Arjuna — Dokumenter Sejarah"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="voice-design-base"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Timbre Dasar
              </label>
              <select
                id="voice-design-base"
                value={customBaseVoice}
                onChange={(e) => setCustomBaseVoice(e.target.value as VoiceName)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                {BASE_VOICES.map((v) => (
                  <option key={v} value={v}>
                    Timbre {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="voice-design-usecase"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Kategori Utama
              </label>
              <select
                id="voice-design-usecase"
                value={customUseCase}
                onChange={(e) =>
                  setCustomUseCase(e.target.value as VoicePersona['useCase'])
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value="Narasi">Narasi</option>
                <option value="Podcast">Podcast</option>
                <option value="Berita">Berita</option>
                <option value="Karakter">Karakter</option>
                <option value="Layanan">Layanan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="voice-design-gender"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Warna Vokal
              </label>
              <select
                id="voice-design-gender"
                value={customGender}
                onChange={(e) =>
                  setCustomGender(e.target.value as 'Wanita' | 'Pria' | 'Netral')
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
              >
                <option value="Wanita">Wanita</option>
                <option value="Pria">Pria</option>
                <option value="Netral">Netral</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="voice-design-accent"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Aksen / Gaya Bahasa
              </label>
              <input
                id="voice-design-accent"
                type="text"
                value={customAccent}
                onChange={(e) => setCustomAccent(e.target.value)}
                placeholder="Indonesia Sinematik"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="voice-design-prompt"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Prompt Desain Karakter Suara
            </label>
            <textarea
              id="voice-design-prompt"
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Deskripsikan usia, tekstur suara, emosi, tempo, dan suasana bicara..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 leading-relaxed focus:border-indigo-600 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="voice-design-sample"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Kalimat Uji Pratinjau
            </label>
            <textarea
              id="voice-design-sample"
              rows={2}
              value={sampleScript}
              onChange={(e) => setSampleScript(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 leading-relaxed focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {designedPreviewUrl && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">
                Hasil Uji Suara Kustom:
              </span>
              <audio controls src={designedPreviewUrl} className="w-full h-8" />
            </div>
          )}

          {designError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
            >
              {designError}
            </div>
          )}

          {savedSuccess && (
            <div
              role="status"
              className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>Karakter suara berhasil ditambahkan ke Voice Library!</span>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void handleTestVoiceDesign()}
              disabled={isDesigning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isDesigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menguji Suara...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Uji Sampel Suara</span>
                </>
              )}
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Simpan ke Voice Library</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

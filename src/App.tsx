import React, { useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BookOpen,
  Clock,
  Download,
  Globe,
  Library,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import {
  AudioHistoryItem,
  buildStyleDirective,
  countWords,
  createSynthesizedDemoWavDataUri,
  DEFAULT_SLIDERS,
  DialogueTurn,
  estimateSpeechSeconds,
  formatDuration,
  INITIAL_VOICE_PERSONAS,
  ModelChoice,
  PRESET_TEMPLATES,
  PresetTemplate,
  TtsMode,
  validateTtsInput,
  VoicePersona,
  VoiceSliders,
} from './utils/audioHelpers';
import { AudioPlayerDeck } from './components/AudioPlayerDeck';
import { VoiceSettingsPanel } from './components/VoiceSettingsPanel';
import { VoiceLabView } from './components/VoiceLabView';
import { StudioProjectsView } from './components/StudioProjectsView';
import { DubbingTranscribeView } from './components/DubbingTranscribeView';
import { OfflineBanner, PWAInstallCard } from './components/PWAInstallCard';

type StudioModule = 'speech' | 'voices' | 'projects' | 'dubbing' | 'history';

const INITIAL_HISTORY: AudioHistoryItem[] = [
  {
    id: 'sample-welcome',
    title: 'Pratinjau Akustik Studio SuaraKita',
    mode: 'single',
    modelLabel: 'WAV 24kHz · Pratinjau',
    voiceSummary: 'Kore — Jurnalis Utama',
    textPreview:
      'Contoh gelombang audio WAV 24kHz siap putar sebelum Anda mulai menghasilkan narasi.',
    createdAt: 'Siap Diputar',
    durationSec: 2,
    audioUrl: createSynthesizedDemoWavDataUri(2.2, 440),
    playbackSpeed: 1,
    isSample: true,
  },
];

const VOCAL_TAGS = [
  { label: '+ <breath>', token: '<breath>' },
  { label: '+ <laugh>', token: '<laugh>' },
  { label: '+ <gasp>', token: '<gasp>' },
  { label: '+ |yeah|', token: '|yeah|' },
  { label: '+ |mhm|', token: '|mhm|' },
];

export default function App() {
  const defaultPreset = PRESET_TEMPLATES[0];

  // Primary ElevenLabs-style module navigation
  const [activeModule, setActiveModule] = useState<StudioModule>('speech');

  // Voice Personas (built-in + custom designed voices)
  const [personas, setPersonas] = useState<VoicePersona[]>(INITIAL_VOICE_PERSONAS);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    defaultPreset.personaId
  );
  const [secondPersonaId, setSecondPersonaId] = useState<string>('puck-creator');

  // Speech Synthesis State
  const [mode, setMode] = useState<TtsMode>(defaultPreset.mode);
  const [modelChoice, setModelChoice] = useState<ModelChoice>('flash-lite');
  const [sliders, setSliders] = useState<VoiceSliders>({ ...DEFAULT_SLIDERS });
  const [customStyleOverride, setCustomStyleOverride] = useState<string>('');

  const [titleInput, setTitleInput] = useState<string>(defaultPreset.title);
  const [singleText, setSingleText] = useState<string>(defaultPreset.text);
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>(
    PRESET_TEMPLATES[3].dialogueTurns || []
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Output History & Bottom Waveform Dock
  const [history, setHistory] = useState<AudioHistoryItem[]>(INITIAL_HISTORY);
  const [activeTrack, setActiveTrack] = useState<AudioHistoryItem | null>(
    INITIAL_HISTORY[0]
  );
  const [historySearch, setHistorySearch] = useState('');

  const scriptTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const activePersona = useMemo(
    () => personas.find((p) => p.id === selectedPersonaId) || personas[0],
    [personas, selectedPersonaId]
  );

  const secondPersona = useMemo(
    () => personas.find((p) => p.id === secondPersonaId) || personas[1] || personas[0],
    [personas, secondPersonaId]
  );

  const combinedScriptText = useMemo(() => {
    if (mode === 'single') return singleText;
    return dialogueTurns.map((t) => t.text).join(' ');
  }, [mode, singleText, dialogueTurns]);

  const wordCount = useMemo(() => countWords(combinedScriptText), [combinedScriptText]);
  const estSeconds = useMemo(
    () => estimateSpeechSeconds(combinedScriptText, sliders.speed),
    [combinedScriptText, sliders.speed]
  );

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.textPreview.toLowerCase().includes(q) ||
        item.voiceSummary.toLowerCase().includes(q)
    );
  }, [history, historySearch]);

  const publishGeneratedTrack = (newItem: AudioHistoryItem) => {
    setHistory((prev) => [newItem, ...prev.filter((i) => !i.isSample)]);
    setActiveTrack(newItem);
  };

  const applyPreset = (preset: PresetTemplate) => {
    setErrorMsg(null);
    setActiveModule('speech');
    setMode(preset.mode);
    setTitleInput(preset.title);
    setSelectedPersonaId(preset.personaId);
    if (preset.mode === 'dialogue') {
      setModelChoice('flash-hd');
      setSecondPersonaId(preset.secondPersonaId || 'kore-news');
      if (preset.dialogueTurns) {
        setDialogueTurns(preset.dialogueTurns.map((t) => ({ ...t })));
      }
    } else {
      setSingleText(preset.text);
    }
  };

  const handleInsertVocalTag = (token: string) => {
    setModelChoice('flash-hd');
    if (mode === 'single') {
      const textarea = scriptTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? singleText.length;
        const end = textarea.selectionEnd ?? singleText.length;
        const before = singleText.slice(0, start);
        const after = singleText.slice(end);
        const spacerBefore = before.length > 0 && !before.endsWith(' ') ? ' ' : '';
        const spacerAfter = after.length > 0 && !after.startsWith(' ') ? ' ' : '';
        const nextText = `${before}${spacerBefore}${token}${spacerAfter}${after}`;
        setSingleText(nextText);
      } else {
        setSingleText((prev) => `${prev.trim()} ${token} `.trimStart());
      }
    } else if (dialogueTurns.length > 0) {
      const lastId = dialogueTurns[dialogueTurns.length - 1].id;
      setDialogueTurns((prev) =>
        prev.map((t) =>
          t.id === lastId ? { ...t, text: `${t.text.trim()} ${token} `.trimStart() } : t
        )
      );
    }
  };

  const synthesizeSpeech = async (overrideText?: string) => {
    const targetMode: TtsMode = overrideText !== undefined ? 'single' : mode;
    const targetText = overrideText !== undefined ? overrideText : singleText;

    const validation = validateTtsInput(targetMode, targetText, dialogueTurns);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Input naskah belum valid.');
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);

    try {
      const baseDirection = customStyleOverride.trim()
        ? `${activePersona.defaultStylePrompt}, ${customStyleOverride.trim()}`
        : activePersona.defaultStylePrompt;

      const primaryStyle = buildStyleDirective(baseDirection, sliders);
      const secondaryStyle = buildStyleDirective(
        secondPersona.defaultStylePrompt,
        sliders
      );

      const hasExpressiveTokens = /<(breath|laugh|gasp)>|\|(yeah|mhm)\|/i.test(
        targetMode === 'single'
          ? targetText
          : dialogueTurns.map((t) => t.text).join(' ')
      );
      const effectiveModel: ModelChoice =
        targetMode === 'dialogue' || hasExpressiveTokens ? 'flash-hd' : modelChoice;

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          modelChoice: effectiveModel,
          text: targetText,
          voice: activePersona.baseVoice,
          style: primaryStyle,
          secondVoice: secondPersona.baseVoice,
          secondStyle: secondaryStyle,
          turns: dialogueTurns,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghasilkan suara.');
      }

      const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
      const nowLabel = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const previewSource =
        targetMode === 'single'
          ? targetText.trim()
          : dialogueTurns.map((t) => `${t.speaker}: ${t.text}`).join(' — ');

      const newItem: AudioHistoryItem = {
        id: `tts-${Date.now()}`,
        title:
          titleInput.trim() ||
          (targetMode === 'dialogue' ? 'Dialog Dua Pembicara' : activePersona.name),
        mode: targetMode,
        modelLabel:
          effectiveModel === 'flash-hd'
            ? 'Studio HD v3.8'
            : 'Multilingual Turbo v3.8',
        voiceSummary:
          targetMode === 'dialogue'
            ? `${activePersona.baseVoice} & ${secondPersona.baseVoice}`
            : activePersona.name,
        textPreview: previewSource.slice(0, 140),
        createdAt: `Pukul ${nowLabel}`,
        durationSec: Math.max(1, estimateSpeechSeconds(previewSource, sliders.speed)),
        audioUrl,
        base64Audio: data.audioBase64,
        playbackSpeed: sliders.speed,
      };

      publishGeneratedTrack(newItem);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat membuat suara.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInsertTranscript = (transcriptText: string, autoSynthesize = false) => {
    setMode('single');
    setTitleInput('Narasi Hasil Scribe Mikrofon');
    setSingleText(transcriptText);
    setActiveModule('speech');
    if (autoSynthesize) {
      void synthesizeSpeech(transcriptText);
    }
  };

  const handleCreateCustomPersona = (
    newPersona: VoicePersona,
    previewAudioBase64?: string
  ) => {
    setPersonas((prev) => [newPersona, ...prev]);
    setSelectedPersonaId(newPersona.id);
    if (previewAudioBase64) {
      publishGeneratedTrack({
        id: `voicedesign-${Date.now()}`,
        title: `Sampel Voice Design · ${newPersona.name}`,
        mode: 'single',
        modelLabel: 'Voice Design HD',
        voiceSummary: newPersona.name,
        textPreview: newPersona.tagline,
        createdAt: 'Baru saja',
        durationSec: 5,
        audioUrl: `data:audio/wav;base64,${previewAudioBase64}`,
        playbackSpeed: 1,
      });
    }
  };

  const handleAddDialogueTurn = () => {
    const lastTurn = dialogueTurns[dialogueTurns.length - 1];
    const nextSpeaker =
      lastTurn?.speaker === 'Pembicara 1' ? 'Pembicara 2' : 'Pembicara 1';
    setDialogueTurns((prev) => [
      ...prev,
      {
        id: `turn-${Date.now()}`,
        speaker: nextSpeaker,
        text: '',
      },
    ]);
  };

  const handleUpdateDialogueTurn = (
    id: string,
    field: 'speaker' | 'text',
    value: string
  ) => {
    setDialogueTurns((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              [field]:
                field === 'speaker'
                  ? (value as 'Pembicara 1' | 'Pembicara 2')
                  : value,
            }
          : t
      )
    );
  };

  const handleRemoveDialogueTurn = (id: string) => {
    if (dialogueTurns.length <= 2) return;
    setDialogueTurns((prev) => prev.filter((t) => t.id !== id));
  };

  const handleResetScript = () => {
    setErrorMsg(null);
    if (mode === 'single') {
      setSingleText('');
      setTitleInput('Naskah Baru');
    } else {
      setDialogueTurns([
        { id: 't-1', speaker: 'Pembicara 1', text: '' },
        { id: 't-2', speaker: 'Pembicara 2', text: '' },
      ]);
      setTitleInput('Dialog Baru');
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (activeTrack?.id === id) {
        setActiveTrack(next[0] || null);
      }
      return next;
    });
  };

  const navItems: {
    id: StudioModule;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'speech',
      label: 'Speech Synthesis',
      shortLabel: 'TTS',
      icon: <AudioLines className="w-4 h-4" />,
    },
    {
      id: 'voices',
      label: 'Voice Library & Design',
      shortLabel: 'Suara',
      icon: <Library className="w-4 h-4" />,
    },
    {
      id: 'projects',
      label: 'Studio Multi-Bab',
      shortLabel: 'Proyek',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'dubbing',
      label: 'Scribe & AI Dubbing',
      shortLabel: 'Dubbing',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'history',
      label: `Riwayat Klip (${history.length})`,
      shortLabel: 'Riwayat',
      icon: <Clock className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <OfflineBanner />

      {/* Strict 3-Zone Top Bar Contract (Sticky on lg desktop, scrolls naturally on mobile to preserve 85%+ open viewport) */}
      <header className="lg:sticky lg:top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveModule('speech')}
            className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
          >
            SuaraKita Studio
          </button>

          <nav
            aria-label="Modul Utama Studio"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <button
              type="button"
              onClick={() => setActiveModule('speech')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'speech'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : ''
              }`}
            >
              Speech Synthesis
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('voices')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'voices'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : ''
              }`}
            >
              VoiceLab
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('projects')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'projects'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : ''
              }`}
            >
              Projects
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('dubbing')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'dubbing'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : ''
              }`}
            >
              Scribe &amp; Dubbing
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('history')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 ${
                activeModule === 'history'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : ''
              }`}
            >
              Riwayat Audio
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveModule('speech');
                void synthesizeSpeech();
              }}
              disabled={isGenerating}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {isGenerating ? 'Mensintesis...' : 'Buat Suara'}
            </button>
          </div>
        </div>
      </header>

      {/* Main ElevenLabs-Style Studio Shell (Desktop Sidebar + Mobile Ergonomic Canvas) */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Workspace Sidebar (Visible on Desktop lg+, replaced by Native Bottom Tab Bar on Mobile) */}
        <aside className="hidden lg:block lg:w-60 shrink-0 space-y-5">
          <div className="border border-slate-200 bg-white rounded-xl p-2 space-y-1">
            {navItems.map((item) => {
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Script Templates in Sidebar */}
          <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-900">
              Templat Naskah Cepat
            </div>
            <div className="space-y-1.5">
              {PRESET_TEMPLATES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="text-xs font-medium text-slate-800 group-hover:text-indigo-600 truncate">
                    {preset.title}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {preset.category}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Desktop / Tablet PWA Install Card */}
          <PWAInstallCard />
        </aside>

        {/* Center / Right Active Module Canvas */}
        <main className="flex-1 min-w-0 space-y-6 pb-8">
          {activeModule === 'speech' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Speech Synthesis Editor (7 cols) */}
              <div className="xl:col-span-7 border border-slate-200 bg-white rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode('single');
                        if (titleInput === PRESET_TEMPLATES[3].title) {
                          setTitleInput(PRESET_TEMPLATES[0].title);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        mode === 'single'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Text to Speech
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setMode('dialogue');
                        setModelChoice('flash-hd');
                        if (titleInput === PRESET_TEMPLATES[0].title) {
                          setTitleInput(PRESET_TEMPLATES[3].title);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        mode === 'dialogue'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Dialog 2 Pembicara
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetScript}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Bersihkan</span>
                  </button>
                </div>

                {/* Clip Title */}
                <div>
                  <label
                    htmlFor="clip-title-input"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Judul Klip Audio
                  </label>
                  <input
                    id="clip-title-input"
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Contoh: Pembukaan Dokumenter Episode 1"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Expressive Vocal Cue Insertion Toolbar */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600">
                      Sisipkan Ekspresi Vokal (Studio HD):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {VOCAL_TAGS.map((tag) => (
                        <button
                          key={tag.token}
                          type="button"
                          onClick={() => handleInsertVocalTag(tag.token)}
                          className="px-2.5 py-1 text-xs font-mono-tabular text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {mode === 'single' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="tts-script-textarea"
                        className="text-xs font-medium text-slate-700"
                      >
                        Naskah Suara
                      </label>
                      <span className="text-xs text-slate-500 font-mono-tabular">
                        {singleText.length} / 5000 karakter
                      </span>
                    </div>
                    <textarea
                      ref={scriptTextareaRef}
                      id="tts-script-textarea"
                      rows={8}
                      value={singleText}
                      onChange={(e) => setSingleText(e.target.value)}
                      placeholder="Ketik atau tempel naskah yang ingin diubah menjadi ucapan manusia yang ekspresif..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none leading-relaxed"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">
                        Naskah Dialog Multi-Pembicara
                      </span>
                      <button
                        type="button"
                        onClick={handleAddDialogueTurn}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Baris</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {dialogueTurns.map((turn, idx) => (
                        <div
                          key={turn.id}
                          className="flex flex-col sm:flex-row sm:items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                            <select
                              aria-label={`Pilih pembicara baris ${idx + 1}`}
                              value={turn.speaker}
                              onChange={(e) =>
                                handleUpdateDialogueTurn(
                                  turn.id,
                                  'speaker',
                                  e.target.value
                                )
                              }
                              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-indigo-600 focus:outline-none shrink-0"
                            >
                              <option value="Pembicara 1">
                                Pembicara 1 ({activePersona.baseVoice})
                              </option>
                              <option value="Pembicara 2">
                                Pembicara 2 ({secondPersona.baseVoice})
                              </option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveDialogueTurn(turn.id)}
                              disabled={dialogueTurns.length <= 2}
                              aria-label={`Hapus baris percakapan ${idx + 1}`}
                              className="sm:hidden p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            aria-label={`Teks dialog baris ${idx + 1}`}
                            value={turn.text}
                            onChange={(e) =>
                              handleUpdateDialogueTurn(turn.id, 'text', e.target.value)
                            }
                            placeholder="Ketik dialog pembicara..."
                            className="w-full sm:flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none leading-relaxed"
                          />

                          <button
                            type="button"
                            onClick={() => handleRemoveDialogueTurn(turn.id)}
                            disabled={dialogueTurns.length <= 2}
                            aria-label={`Hapus baris percakapan ${idx + 1}`}
                            className="hidden sm:inline-flex p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800"
                  >
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                    <span>{wordCount} kata</span>
                    <span aria-hidden="true">·</span>
                    <span>Estimasi ~{formatDuration(estSeconds)}</span>
                    <span aria-hidden="true">·</span>
                    <span>Kecepatan {sliders.speed.toFixed(2)}x</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void synthesizeSpeech()}
                    disabled={isGenerating}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mensintesis Audio...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4" />
                        <span>Generate Speech</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Inspector: ElevenLabs-style Voice Settings & Sliders (5 cols) */}
              <div className="xl:col-span-5">
                <VoiceSettingsPanel
                  personas={personas}
                  selectedPersonaId={selectedPersonaId}
                  onSelectPersona={setSelectedPersonaId}
                  secondPersonaId={secondPersonaId}
                  onSelectSecondPersona={setSecondPersonaId}
                  isDialogueMode={mode === 'dialogue'}
                  modelChoice={modelChoice}
                  onChangeModelChoice={setModelChoice}
                  sliders={sliders}
                  onChangeSliders={setSliders}
                  customStyleOverride={customStyleOverride}
                  onChangeCustomStyle={setCustomStyleOverride}
                  onOpenVoiceLab={() => setActiveModule('voices')}
                />
              </div>
            </div>
          )}

          {activeModule === 'voices' && (
            <VoiceLabView
              personas={personas}
              selectedPersonaId={selectedPersonaId}
              onUsePersonaInTts={(id) => {
                setSelectedPersonaId(id);
                setActiveModule('speech');
              }}
              onCreateCustomPersona={handleCreateCustomPersona}
            />
          )}

          {activeModule === 'projects' && (
            <StudioProjectsView
              personas={personas}
              sliders={sliders}
              onPublishTrack={publishGeneratedTrack}
            />
          )}

          {activeModule === 'dubbing' && (
            <DubbingTranscribeView
              personas={personas}
              selectedPersonaId={selectedPersonaId}
              sliders={sliders}
              onInsertToTts={handleInsertTranscript}
              onPublishDubbedTrack={publishGeneratedTrack}
            />
          )}

          {activeModule === 'history' && (
            <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Riwayat Generasi Audio ({history.length})
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Arsip seluruh klip WAV 24kHz dari Speech Synthesis, Voice Design, Projects, dan AI Dubbing.
                  </p>
                </div>

                <div className="relative w-full sm:w-64 shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    aria-label="Cari klip riwayat"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cari judul atau suara..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {filteredHistory.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    Tidak ada klip audio yang cocok dengan kata kunci pencarian.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch('');
                      setActiveModule('speech');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Buka Speech Synthesis
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                        <th className="py-3 px-3">Judul &amp; Cuplikan</th>
                        <th className="py-3 px-3">Karakter &amp; Mesin</th>
                        <th className="py-3 px-3 text-right">Durasi</th>
                        <th className="py-3 px-3 text-right">Waktu</th>
                        <th className="py-3 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {filteredHistory.map((item) => {
                        const isCurrent = activeTrack?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              isCurrent ? 'bg-indigo-50/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 max-w-md">
                              <div className="font-medium text-slate-900 truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-slate-500 truncate mt-0.5">
                                {item.textPreview}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                              {item.voiceSummary} · {item.modelLabel}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-600 text-right font-mono-tabular whitespace-nowrap">
                              {formatDuration(item.durationSec)}
                            </td>
                            <td className="py-3 px-3 text-xs text-slate-500 text-right font-mono-tabular whitespace-nowrap">
                              {item.createdAt}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveTrack(item)}
                                  aria-label={`Muat ${item.title} ke pemutar`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>Putar</span>
                                </button>
                                <a
                                  href={item.audioUrl}
                                  download={`${item.title
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, '-')}.wav`}
                                  aria-label={`Unduh WAV ${item.title}`}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistoryItem(item.id)}
                                  aria-label={`Hapus ${item.title}`}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Mobile-only Quick Templates & PWA Install Card at bottom of scrollable feed */}
          <div className="lg:hidden space-y-4 pt-2">
            <div className="border border-slate-200 bg-white rounded-xl p-4 space-y-2.5">
              <div className="text-xs font-semibold text-slate-900">
                Templat Naskah Cepat
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PRESET_TEMPLATES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left shrink-0 transition-colors"
                  >
                    <div className="text-xs font-medium text-slate-900 whitespace-nowrap">
                      {preset.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <PWAInstallCard />
          </div>
        </main>
      </div>

      {/* Audio Waveform Player Dock (Flows above mobile tab bar; sticky on desktop) */}
      <footer className="lg:sticky lg:bottom-0 z-20 mt-auto pb-16 lg:pb-0">
        <AudioPlayerDeck activeTrack={activeTrack} />
      </footer>

      {/* Mobile Native-Feel Bottom Tab Navigation Bar (<= 60px height, <= 15% sticky viewport budget) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14 px-1">
          {navItems.map((item) => {
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`h-full flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors ${
                  active
                    ? 'text-indigo-600 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {item.icon}
                <span className="text-[10px] tracking-tight whitespace-nowrap truncate max-w-[64px]">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

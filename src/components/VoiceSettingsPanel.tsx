import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  DEFAULT_SLIDERS,
  ModelChoice,
  VoicePersona,
  VoiceSliders,
} from '../utils/audioHelpers';

interface VoiceSettingsPanelProps {
  personas: VoicePersona[];
  selectedPersonaId: string;
  onSelectPersona: (id: string) => void;
  secondPersonaId?: string;
  onSelectSecondPersona?: (id: string) => void;
  isDialogueMode: boolean;
  modelChoice: ModelChoice;
  onChangeModelChoice: (m: ModelChoice) => void;
  sliders: VoiceSliders;
  onChangeSliders: (next: VoiceSliders) => void;
  customStyleOverride: string;
  onChangeCustomStyle: (val: string) => void;
  onOpenVoiceLab: () => void;
}

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  personas,
  selectedPersonaId,
  onSelectPersona,
  secondPersonaId,
  onSelectSecondPersona,
  isDialogueMode,
  modelChoice,
  onChangeModelChoice,
  sliders,
  onChangeSliders,
  customStyleOverride,
  onChangeCustomStyle,
  onOpenVoiceLab,
}) => {
  const activePersona =
    personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const handleResetSliders = () => {
    onChangeSliders({ ...DEFAULT_SLIDERS });
    onChangeCustomStyle('');
  };

  return (
    <aside className="border border-slate-200 bg-white rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <h2 className="text-sm font-semibold text-slate-900">
          Pengaturan Suara &amp; Model
        </h2>
        <button
          type="button"
          onClick={onOpenVoiceLab}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 whitespace-nowrap shrink-0"
        >
          Jelajahi Voice Library →
        </button>
      </div>

      {/* Primary Voice Selector */}
      <div className="space-y-1.5">
        <label
          htmlFor="primary-persona-select"
          className="block text-xs font-medium text-slate-700"
        >
          {isDialogueMode ? 'Suara Pembicara 1' : 'Suara Aktif'}
        </label>
        <select
          id="primary-persona-select"
          value={selectedPersonaId}
          onChange={(e) => onSelectPersona(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.accent})
            </option>
          ))}
        </select>
        {activePersona && (
          <p className="text-xs text-slate-500">
            {activePersona.gender} · {activePersona.useCase} — {activePersona.tagline}
          </p>
        )}
      </div>

      {/* Secondary Voice Selector for Dialogue */}
      {isDialogueMode && onSelectSecondPersona && (
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <label
            htmlFor="secondary-persona-select"
            className="block text-xs font-medium text-slate-700"
          >
            Suara Pembicara 2
          </label>
          <select
            id="secondary-persona-select"
            value={secondPersonaId}
            onChange={(e) => onSelectSecondPersona(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.accent})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Model Engine Selector */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <span className="block text-xs font-medium text-slate-700">
          Mesin Model Sintesis
        </span>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={isDialogueMode}
            onClick={() => onChangeModelChoice('flash-lite')}
            className={`text-left p-3 rounded-lg border transition-colors ${
              !isDialogueMode && modelChoice === 'flash-lite'
                ? 'border-indigo-600 bg-indigo-50/40'
                : 'border-slate-200 hover:border-slate-300 disabled:opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Multilingual Turbo v3.8
              </span>
              <span className="text-xs text-slate-500 font-mono-tabular">
                Latensi Rendah
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Optimal untuk pembacaan artikel cepat, narasi umum, dan asisten suara.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChangeModelChoice('flash-hd')}
            className={`text-left p-3 rounded-lg border transition-colors ${
              isDialogueMode || modelChoice === 'flash-hd'
                ? 'border-indigo-600 bg-indigo-50/40'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Expressive Studio HD v3.8
              </span>
              <span className="text-xs text-slate-500 font-mono-tabular">
                Voice Design &amp; Emosi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendukung ekspresi &lt;laugh&gt;, &lt;breath&gt;, |yeah|, desain persona, &amp; 2 pembicara.
            </p>
          </button>
        </div>
      </div>

      {/* ElevenLabs-style Acoustic Sliders */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">
            Parameter Karakter Vokal
          </span>
          <button
            type="button"
            onClick={handleResetSliders}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-speed" className="font-medium text-slate-700">
              Kecepatan Bicara (Speed)
            </label>
            <span className="font-mono-tabular text-slate-600">
              {sliders.speed.toFixed(2)}x
            </span>
          </div>
          <input
            id="slider-speed"
            type="range"
            min={0.75}
            max={1.25}
            step={0.05}
            value={sliders.speed}
            onChange={(e) =>
              onChangeSliders({ ...sliders, speed: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Lambat</span>
            <span>Normal</span>
            <span>Cepat</span>
          </div>
        </div>

        {/* Stability */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-stability" className="font-medium text-slate-700">
              Stabilitas (Stability)
            </label>
            <span className="font-mono-tabular text-slate-600">
              {sliders.stability}%
            </span>
          </div>
          <input
            id="slider-stability"
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliders.stability}
            onChange={(e) =>
              onChangeSliders({ ...sliders, stability: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Lebih Ekspresif</span>
            <span>Lebih Konsisten</span>
          </div>
        </div>

        {/* Similarity / Clarity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-similarity" className="font-medium text-slate-700">
              Kejernihan &amp; Kemiripan (Clarity)
            </label>
            <span className="font-mono-tabular text-slate-600">
              {sliders.similarity}%
            </span>
          </div>
          <input
            id="slider-similarity"
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliders.similarity}
            onChange={(e) =>
              onChangeSliders({ ...sliders, similarity: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Rendah</span>
            <span>Tinggi</span>
          </div>
        </div>

        {/* Style Exaggeration */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="slider-style" className="font-medium text-slate-700">
              Penekanan Gaya (Style Exaggeration)
            </label>
            <span className="font-mono-tabular text-slate-600">
              {sliders.styleExaggeration}%
            </span>
          </div>
          <input
            id="slider-style"
            type="range"
            min={0}
            max={100}
            step={1}
            value={sliders.styleExaggeration}
            onChange={(e) =>
              onChangeSliders({
                ...sliders,
                styleExaggeration: Number(e.target.value),
              })
            }
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Netral</span>
            <span>Dramatis</span>
          </div>
        </div>

        {/* Speaker Boost Checkbox */}
        <label className="flex items-center justify-between pt-1 cursor-pointer">
          <span className="text-xs font-medium text-slate-700">
            Speaker Boost (Kejernihan Studio)
          </span>
          <input
            type="checkbox"
            checked={sliders.speakerBoost}
            onChange={(e) =>
              onChangeSliders({ ...sliders, speakerBoost: e.target.checked })
            }
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
          />
        </label>

        {/* Optional Custom Direction */}
        <div className="pt-2 border-t border-slate-100">
          <label
            htmlFor="custom-style-override"
            className="block text-xs font-medium text-slate-700 mb-1"
          >
            Arahan Sutradara Tambahan (Opsional)
          </label>
          <input
            id="custom-style-override"
            type="text"
            value={customStyleOverride}
            onChange={(e) => onChangeCustomStyle(e.target.value)}
            placeholder="Contoh: Berbisik pelan seperti rahasia..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none"
          />
        </div>
      </div>
    </aside>
  );
};

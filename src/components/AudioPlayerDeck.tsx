import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import {
  AudioHistoryItem,
  formatDuration,
  generateWaveformBars,
} from '../utils/audioHelpers';

interface AudioPlayerDeckProps {
  activeTrack: AudioHistoryItem | null;
}

export const AudioPlayerDeck: React.FC<AudioPlayerDeckProps> = ({ activeTrack }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const waveformBars = useMemo(
    () => generateWaveformBars(activeTrack?.id || 'default-wave', 48),
    [activeTrack?.id]
  );

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    const initialSpeed = activeTrack?.playbackSpeed ?? 1;
    setPlaybackRate(initialSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = initialSpeed;
    }
    if (activeTrack) {
      setDuration(activeTrack.durationSec || 0);
    } else {
      setDuration(0);
    }
  }, [activeTrack?.id, activeTrack?.audioUrl, activeTrack?.playbackSpeed]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el || !activeTrack) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      try {
        el.playbackRate = playbackRate;
        await el.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const handleBarSeek = (barIndex: number) => {
    const el = audioRef.current;
    if (!el || !activeTrack) return;
    const effectiveDur = duration > 0 ? duration : activeTrack.durationSec || 1;
    const targetTime = (barIndex / waveformBars.length) * effectiveDur;
    el.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedCycle = () => {
    const rates = [0.85, 1, 1.15, 1.25, 1.5];
    const currentIdx = rates.findIndex((r) => Math.abs(r - playbackRate) < 0.05);
    const nextRate = rates[(currentIdx + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  if (!activeTrack) {
    return (
      <div className="border-t border-slate-200 bg-white px-6 py-3.5 text-center text-xs text-slate-500">
        Pilih atau hasilkan klip suara untuk membuka konsol pemutar WAV 24kHz.
      </div>
    );
  }

  const effectiveDuration = duration > 0 ? duration : activeTrack.durationSec || 1;
  const progressRatio = Math.min(1, Math.max(0, currentTime / effectiveDuration));

  return (
    <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-2.5 sm:py-3">
      <audio
        ref={audioRef}
        src={activeTrack.audioUrl}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            setDuration(d);
          }
          e.currentTarget.playbackRate = playbackRate;
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        preload="metadata"
      />

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 lg:gap-4">
        {/* Top Row on Mobile / Left+Right on Desktop */}
        <div className="flex items-center justify-between gap-3 min-w-0 lg:w-72 shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Jeda pemutaran audio' : 'Putar audio'}
              className="w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                {activeTrack.title}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 truncate">
                <span className="truncate">{activeTrack.voiceSummary}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular whitespace-nowrap">
                  {formatDuration(currentTime)} / {formatDuration(effectiveDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile quick download + speed */}
          <div className="flex lg:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleSpeedCycle}
              aria-label="Ubah kecepatan putar"
              className="min-h-[36px] px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-mono-tabular whitespace-nowrap shrink-0"
            >
              {playbackRate}x
            </button>
            <a
              href={activeTrack.audioUrl}
              download={`${activeTrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'suara'}.wav`}
              aria-label="Unduh berkas WAV"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Interactive Waveform Scrubber (Compact on mobile, spacious on desktop) */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="hidden lg:inline-block text-xs font-mono-tabular text-slate-500 w-11 text-right shrink-0">
            {formatDuration(currentTime)}
          </span>

          <div
            role="group"
            aria-label="Gelombang audio interaktif"
            className="flex-1 h-6 sm:h-9 flex items-center gap-0.5 px-0.5 cursor-pointer select-none"
          >
            {waveformBars.map((barHeight, idx) => {
              const barRatio = idx / waveformBars.length;
              const isPlayed = barRatio <= progressRatio;
              return (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Lompat ke bagian ${Math.round(barRatio * 100)}%`}
                  onClick={() => handleBarSeek(idx)}
                  className="flex-1 h-full flex items-center justify-center group focus:outline-none"
                >
                  <span
                    className={`w-full max-w-[4px] rounded-full transition-colors ${
                      isPlayed
                        ? 'bg-indigo-600'
                        : 'bg-slate-200 group-hover:bg-slate-400'
                    }`}
                    style={{ height: `${Math.max(20, Math.round(barHeight * 100))}%` }}
                  />
                </button>
              );
            })}
          </div>

          <span className="hidden lg:inline-block text-xs font-mono-tabular text-slate-500 w-11 shrink-0">
            {formatDuration(effectiveDuration)}
          </span>
        </div>

        {/* Desktop Transport & Export Controls */}
        <div className="hidden lg:flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRestart}
            aria-label="Ulang dari awal"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSpeedCycle}
            aria-label="Ubah kecepatan putar"
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-mono-tabular whitespace-nowrap shrink-0"
          >
            {playbackRate}x
          </button>

          <div className="flex items-center gap-1 text-xs text-slate-400 px-1">
            <Volume2 className="w-3.5 h-3.5" />
            <span className="font-mono-tabular">24kHz</span>
          </div>

          <a
            href={activeTrack.audioUrl}
            download={`${activeTrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'suara'}.wav`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh WAV</span>
          </a>
        </div>
      </div>
    </div>
  );
};

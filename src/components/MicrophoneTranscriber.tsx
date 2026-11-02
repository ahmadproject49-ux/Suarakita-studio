import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Copy, FileAudio, Loader2, Mic, Square, Upload } from 'lucide-react';
import { formatDuration } from '../utils/audioHelpers';
import { postApiJson } from '../utils/apiClient';

interface MicrophoneTranscriberProps {
  onInsertToTts: (transcript: string, autoSynthesize?: boolean) => void;
}

export const MicrophoneTranscriber: React.FC<MicrophoneTranscriberProps> = ({
  onInsertToTts,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Gagal membaca berkas audio.'));
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas audio.'));
      reader.readAsDataURL(blob);
    });

  const sendAudioForTranscription = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
      const base64Data = await blobToBase64(blob);
      const data = await postApiJson<{ transcript?: string }>('/api/transcribe', {
        audioBase64: base64Data,
        mimeType,
      });

      if (!data.transcript) {
        setErrorMsg('Tidak ada ucapan yang terdeteksi dalam rekaman. Silakan coba bicara lebih dekat ke mikrofon.');
      } else {
        setTranscript(data.transcript);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat transkripsi.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Browser Anda tidak mendukung akses perekaman mikrofon. Anda tetap dapat mengunggah berkas audio.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: mime });
        if (audioBlob.size === 0) {
          setErrorMsg('Rekaman kosong. Silakan coba merekam kembali.');
          return;
        }
        const previewUrl = URL.createObjectURL(audioBlob);
        setLastAudioUrl(previewUrl);
        await sendAudioForTranscription(audioBlob, mime);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      setErrorMsg(
        'Izin mikrofon ditolak atau perangkat tidak ditemukan. Pastikan izin mikrofon aktif di browser Anda, atau unggah berkas audio.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    const previewUrl = URL.createObjectURL(file);
    setLastAudioUrl(previewUrl);
    await sendAudioForTranscription(file, file.type || 'audio/wav');
    e.target.value = '';
  };

  const handleCopy = async () => {
    if (!transcript.trim()) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures silently
    }
  };

  return (
    <div className="border border-slate-200 bg-white rounded-xl p-6 space-y-6">
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Rekam Mikrofon &amp; Transkripsi Otomatis
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Rekam suara Anda langsung melalui mikrofon atau unggah berkas audio untuk diubah menjadi teks naskah siap pakai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-upload-input"
          />
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={isTranscribing}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Mic className="w-4 h-4" />
              <span>Mulai Rekam Suara</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="font-mono-tabular">
                Hentikan ({formatDuration(recordingSeconds)})
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || isTranscribing}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Berkas Audio</span>
          </button>
        </div>
      </div>

      {isRecording && (
        <div
          role="status"
          className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">
                Sedang merekam dari mikrofon...
              </p>
              <p className="text-xs text-red-700">
                Ucapkan kalimat Anda dengan jelas, lalu tekan Hentikan untuk mulai mentranskripsi.
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold font-mono-tabular text-red-800 shrink-0">
            {formatDuration(recordingSeconds)}
          </span>
        </div>
      )}

      {isTranscribing && (
        <div
          role="status"
          className="p-5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-3 text-sm text-slate-700"
        >
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
          <span>Memproses transkripsi audio...</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
        >
          {errorMsg}
        </div>
      )}

      {lastAudioUrl && !isRecording && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <FileAudio className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Rekaman sumber siap diputar ulang</span>
          </div>
          <audio controls src={lastAudioUrl} className="h-8 max-w-full sm:w-64" />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="transcript-output"
            className="text-sm font-medium text-slate-800"
          >
            Hasil Transkripsi
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!transcript.trim()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
            </button>
          </div>
        </div>

        <textarea
          id="transcript-output"
          rows={5}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Hasil transkripsi suara mikrofon Anda akan muncul di sini. Anda juga dapat menyunting teks sebelum mengubahnya menjadi suara baru..."
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15 leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500">
            Tip: Setelah transkripsi selesai, kirim langsung teks ini ke Studio Text-to-Speech untuk disuarakan ulang dengan karakter vokal pilihan Anda.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!transcript.trim()}
              onClick={() => onInsertToTts(transcript, false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Kirim ke Editor TTS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={!transcript.trim()}
              onClick={() => onInsertToTts(transcript, true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>Suarakan Transkrip Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

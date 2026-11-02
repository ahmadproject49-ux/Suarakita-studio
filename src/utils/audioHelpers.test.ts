import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStyleDirective,
  concatenateWavDataUris,
  countWords,
  createSynthesizedDemoWavDataUri,
  DEFAULT_SLIDERS,
  estimateSpeechSeconds,
  formatDuration,
  generateWaveformBars,
  INITIAL_VOICE_PERSONAS,
  validateTtsInput,
} from './audioHelpers';

test('countWords and estimateSpeechSeconds respect speed multiplier', () => {
  assert.equal(countWords('Halo selamat pagi semua'), 4);
  const fullMinWords = new Array(135).fill('kata').join(' ');
  assert.equal(estimateSpeechSeconds(fullMinWords, 1.0), 60);
  assert.equal(estimateSpeechSeconds(fullMinWords, 1.2), 50);
});

test('formatDuration outputs tabular MM:SS format', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(9), '00:09');
  assert.equal(formatDuration(125), '02:05');
});

test('buildStyleDirective maps stability, exaggeration, speed, and speakerBoost into vocal style prompt', () => {
  const highStability = buildStyleDirective('Narator tenang', {
    ...DEFAULT_SLIDERS,
    stability: 85,
    styleExaggeration: 75,
    speed: 1.2,
    speakerBoost: true,
  });
  assert.ok(highStability.includes('Narator tenang'));
  assert.ok(highStability.includes('consistent, steady cadence'));
  assert.ok(highStability.includes('expressive theatrical delivery'));
  assert.ok(highStability.includes('brisk, energetic speaking pace'));
  assert.ok(highStability.includes('close-mic studio broadcast presence'));
});

test('generateWaveformBars produces normalized bar heights of exact count', () => {
  const bars = generateWaveformBars('episode-1', 48);
  assert.equal(bars.length, 48);
  for (const h of bars) {
    assert.ok(h >= 0.18 && h <= 1.0);
  }
});

test('concatenateWavDataUris merges two 24kHz WAV clips cleanly by stripping secondary 44-byte header', () => {
  const clipA = createSynthesizedDemoWavDataUri(0.25, 440);
  const clipB = createSynthesizedDemoWavDataUri(0.25, 554);

  const bufA = Buffer.from(clipA.split(',')[1], 'base64');
  const bufB = Buffer.from(clipB.split(',')[1], 'base64');

  const merged = concatenateWavDataUris([clipA, clipB]);
  assert.ok(merged);
  const mergedBuf = Buffer.from(merged!.split(',')[1], 'base64');

  assert.equal(mergedBuf.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(mergedBuf.subarray(8, 12).toString('ascii'), 'WAVE');
  // Expected length: 44 header + (bufA - 44) + (bufB - 44)
  assert.equal(mergedBuf.length, 44 + (bufA.length - 44) + (bufB.length - 44));
  assert.ok(INITIAL_VOICE_PERSONAS.length >= 6);
});

test('validateTtsInput enforces single and multi-speaker rules', () => {
  assert.equal(validateTtsInput('single', '  ', []).valid, false);
  assert.equal(validateTtsInput('single', 'Tes narasi studio.', []).valid, true);
  assert.equal(
    validateTtsInput('dialogue', '', [
      { id: '1', speaker: 'Pembicara 1', text: 'Halo' },
      { id: '2', speaker: 'Pembicara 2', text: 'Hai juga' },
    ]).valid,
    true
  );
});

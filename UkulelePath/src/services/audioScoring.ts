export interface MeterSample {
  timeMs: number;
  level: number;
}

export interface PracticeAssessment {
  overall: number;
  rhythm: number;
  completion: number;
  expectedNotes: number;
  detectedNotes: number;
  averageTimingErrorMs: number;
  confidence: 'low' | 'medium' | 'high';
  feedback: string[];
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function detectOnsets(samples: MeterSample[]) {
  const usable = samples
    .filter((sample) => Number.isFinite(sample.level) && Number.isFinite(sample.timeMs))
    .sort((a, b) => a.timeMs - b.timeMs);
  if (usable.length < 4) return { onsets: [] as number[], levelRange: 0 };

  const levels = usable.map((sample) => sample.level).sort((a, b) => a - b);
  const noiseFloor = levels[Math.floor(levels.length * 0.25)];
  const peak = levels[levels.length - 1];
  const threshold = Math.max(-42, Math.min(-12, Math.min(peak - 4, noiseFloor + 10)));
  const onsets: number[] = [];
  let previousLevel = noiseFloor;

  usable.forEach((sample) => {
    const roseAboveThreshold = sample.level >= threshold && previousLevel < threshold;
    const farEnoughFromLast = !onsets.length || sample.timeMs - onsets[onsets.length - 1] >= 180;
    if (roseAboveThreshold && farEnoughFromLast) onsets.push(sample.timeMs);
    previousLevel = sample.level;
  });

  return { onsets, levelRange: peak - noiseFloor };
}

function expectedOffsets(durationBeats: number[], tempo: number) {
  const beatMs = 60000 / tempo;
  let elapsed = 0;
  return durationBeats.map((duration, index) => {
    if (index > 0) elapsed += durationBeats[index - 1] * beatMs;
    return elapsed;
  });
}

function bestObservedWindow(onsets: number[], expected: number[]) {
  if (!onsets.length) return [];
  if (onsets.length <= expected.length) return onsets;

  let best = onsets.slice(0, expected.length);
  let bestError = Number.POSITIVE_INFINITY;
  for (let start = 0; start <= onsets.length - expected.length; start += 1) {
    const candidate = onsets.slice(start, start + expected.length);
    const origin = candidate[0];
    const error = candidate.reduce((sum, time, index) => (
      sum + Math.abs(time - origin - expected[index])
    ), 0);
    if (error < bestError) {
      best = candidate;
      bestError = error;
    }
  }
  return best;
}

export function scorePracticeRecording(
  samples: MeterSample[],
  durationBeats: number[],
  tempo: number,
): PracticeAssessment | null {
  const expected = expectedOffsets(durationBeats, tempo);
  const { onsets, levelRange } = detectOnsets(samples);
  if (!expected.length || !onsets.length || levelRange < 5) return null;

  const observed = bestObservedWindow(onsets, expected);
  const origin = observed[0];
  const pairedCount = Math.min(observed.length, expected.length);
  const errors = Array.from({ length: pairedCount }, (_, index) => (
    Math.abs(observed[index] - origin - expected[index])
  ));
  const averageTimingErrorMs = errors.length
    ? Math.round(errors.reduce((sum, value) => sum + value, 0) / errors.length)
    : 0;
  const beatMs = 60000 / tempo;
  const rhythm = Math.round(clamp(100 - averageTimingErrorMs / (beatMs * 0.55) * 100));
  const completion = Math.round(clamp(
    100 - Math.abs(onsets.length - expected.length) / expected.length * 100,
  ));
  const overall = Math.round(rhythm * 0.7 + completion * 0.3);
  const countRatio = onsets.length / expected.length;
  const confidence = levelRange >= 14 && countRatio >= 0.75 && countRatio <= 1.35
    ? 'high'
    : levelRange >= 8 && countRatio >= 0.5 && countRatio <= 1.75
      ? 'medium'
      : 'low';
  const feedback: string[] = [];

  if (completion >= 90) feedback.push('检测到的拨弦次数与练习谱基本一致。');
  else if (onsets.length < expected.length) feedback.push(`可能漏弹了 ${expected.length - onsets.length} 次，请放慢后再试。`);
  else feedback.push(`检测到 ${onsets.length - expected.length} 次额外起音，注意杂音或重复拨弦。`);

  if (rhythm >= 85) feedback.push('音与音之间的间距比较稳定。');
  else if (rhythm >= 65) feedback.push('整体节奏接近目标，个别落音还可更贴近拍点。');
  else feedback.push('落音间距波动较大，建议先跟着视觉节拍慢练。');

  if (confidence === 'low') feedback.push('本次环境噪声或音量影响了识别，分数仅供参考。');

  return {
    overall, rhythm, completion,
    expectedNotes: expected.length,
    detectedNotes: onsets.length,
    averageTimingErrorMs,
    confidence,
    feedback,
  };
}

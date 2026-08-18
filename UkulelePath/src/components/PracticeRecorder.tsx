import {
  AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer,
  useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MeterSample, PracticeAssessment, scorePracticeRecording } from '../services/audioScoring';
import { colors } from '../theme';

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'cache' as const,
  isMeteringEnabled: true,
};

const confidenceLabels = { low: '低置信度', medium: '中等置信度', high: '较高置信度' };

export function PracticeRecorder({ durationBeats, tempo }: {
  durationBeats: number[];
  tempo: number;
}) {
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, 50);
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const playerStatus = useAudioPlayerStatus(player);
  const samples = useRef<MeterSample[]>([]);
  const lastSampleTime = useRef(-1);
  const [assessment, setAssessment] = useState<PracticeAssessment | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!recorderState.isRecording || typeof recorderState.metering !== 'number') return;
    if (recorderState.durationMillis === lastSampleTime.current) return;
    lastSampleTime.current = recorderState.durationMillis;
    samples.current.push({
      timeMs: recorderState.durationMillis,
      level: recorderState.metering,
    });
  }, [recorderState.durationMillis, recorderState.isRecording, recorderState.metering]);

  async function startRecording() {
    setBusy(true);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要麦克风权限', '请允许使用麦克风，才能录制并分析练习。');
        return;
      }
      player.pause();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      samples.current = [];
      lastSampleTime.current = -1;
      setAssessment(null);
      setRecordingUri(null);
      await recorder.prepareToRecordAsync(recordingOptions);
      recorder.record();
    } catch {
      Alert.alert('无法开始录音', '请检查麦克风是否正被其他应用占用，然后重试。');
    } finally {
      setBusy(false);
    }
  }

  async function stopRecording() {
    setBusy(true);
    try {
      await recorder.stop();
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      const uri = recorder.uri;
      if (uri) {
        setRecordingUri(uri);
        player.replace({ uri });
      }
      setAssessment(scorePracticeRecording(samples.current, durationBeats, tempo));
    } catch {
      Alert.alert('录音未能完成', '这次录音没有保存，请重新尝试。');
    } finally {
      setBusy(false);
    }
  }

  const recordingSeconds = Math.ceil(recorderState.durationMillis / 1000);

  return (
    <View style={styles.box}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={styles.kicker}>实验功能</Text>
          <Text style={styles.title}>录音练习反馈</Text>
        </View>
        {recorderState.isRecording && <Text style={styles.recording}>● {recordingSeconds}s</Text>}
      </View>
      <Text style={styles.help}>
        从第一步开始完整弹一遍。评分时请关闭外放节拍器声音，避免节拍声被识别成拨弦。
      </Text>
      <Text style={styles.privacy}>录音仅在本机临时保存，用于本次回放和分析，不会上传。</Text>

      <Pressable
        disabled={busy}
        onPress={recorderState.isRecording ? stopRecording : startRecording}
        style={[styles.primaryButton, recorderState.isRecording && styles.stopButton, busy && styles.disabled]}
      >
        <Text style={styles.primaryText}>
          {busy ? '请稍候…' : recorderState.isRecording ? '停止并评分' : '开始录音'}
        </Text>
      </Pressable>

      {recordingUri && (
        <Pressable
          onPress={() => playerStatus.playing ? player.pause() : player.play()}
          style={styles.replayButton}
        >
          <Text style={styles.replayText}>{playerStatus.playing ? '暂停回放' : '回放本次录音'}</Text>
        </Pressable>
      )}

      {assessment ? (
        <View style={styles.result}>
          <View style={styles.scoreRow}>
            <View><Text style={styles.score}>{assessment.overall}</Text><Text style={styles.scoreUnit}>综合反馈</Text></View>
            <View style={styles.metrics}>
              <Text style={styles.metric}>节奏稳定 {assessment.rhythm}</Text>
              <Text style={styles.metric}>完成度 {assessment.completion}</Text>
              <Text style={styles.confidence}>{confidenceLabels[assessment.confidence]}</Text>
            </View>
          </View>
          <Text style={styles.detail}>
            目标 {assessment.expectedNotes} 次 · 检测 {assessment.detectedNotes} 次 · 平均时序偏差约 {assessment.averageTimingErrorMs}ms
          </Text>
          {assessment.feedback.map((item) => <Text key={item} style={styles.feedback}>· {item}</Text>)}
          <Text style={styles.disclaimer}>当前仅分析起音次数和节奏，不判断音高、弦号或和弦是否正确。</Text>
        </View>
      ) : recordingUri ? (
        <Text style={styles.noResult}>没有检测到足够清晰的拨弦，请靠近手机并在较安静的环境重试。</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  kicker: { color: colors.wood, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 3 },
  recording: { color: '#B43E32', fontSize: 13, fontWeight: '900' },
  help: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  privacy: { color: colors.leaf, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  primaryButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  stopButton: { backgroundColor: '#B65345' },
  primaryText: { color: colors.white, fontWeight: '900', fontSize: 14 },
  replayButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.leaf, alignItems: 'center', justifyContent: 'center' },
  replayText: { color: colors.leaf, fontWeight: '900', fontSize: 13 },
  result: { backgroundColor: colors.leafSoft, borderRadius: 14, padding: 14, gap: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  score: { color: colors.leaf, fontSize: 38, fontWeight: '900', lineHeight: 42 },
  scoreUnit: { color: colors.inkMuted, fontSize: 10, fontWeight: '800' },
  metrics: { flex: 1, gap: 3 },
  metric: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  confidence: { color: colors.wood, fontSize: 11, fontWeight: '800' },
  detail: { color: colors.inkMuted, fontSize: 11, lineHeight: 17 },
  feedback: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.wood, fontSize: 10, lineHeight: 15, marginTop: 3 },
  noResult: { color: colors.wood, fontSize: 12, lineHeight: 18 },
  disabled: { opacity: 0.5 },
});

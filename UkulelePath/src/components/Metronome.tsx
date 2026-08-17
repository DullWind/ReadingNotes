import { useEffect, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { colors } from '../theme';

const clickSource = require('../../assets/audio/metronome-click.wav');

export function Metronome({ tempo, onTempoChange }: {
  tempo: number;
  onTempoChange: (tempo: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const clickPlayer = useAudioPlayer(clickSource);

  useEffect(() => {
    if (!running) {
      setBeat(-1);
      return undefined;
    }

    let nextBeat = 0;
    const tick = () => {
      setBeat(nextBeat);
      if (soundEnabled) {
        clickPlayer.volume = nextBeat === 0 ? 1 : 0.62;
        void clickPlayer.seekTo(0).then(() => clickPlayer.play()).catch(() => undefined);
      }
      if (vibrationEnabled) Vibration.vibrate(nextBeat === 0 ? 45 : 20);
      nextBeat = (nextBeat + 1) % 4;
    };

    tick();
    const timer = setInterval(tick, 60000 / tempo);
    return () => clearInterval(timer);
  }, [clickPlayer, running, soundEnabled, tempo, vibrationEnabled]);

  return (
    <View style={styles.box}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>离线节拍器</Text>
          <Text style={styles.title}>声音＋视觉＋手机振动</Text>
        </View>
        <Text style={styles.meter}>4/4</Text>
      </View>

      <View style={styles.beats}>
        {[0, 1, 2, 3].map((value) => (
          <View key={value} style={[styles.beat, beat === value && styles.beatActive]}>
            <Text style={[styles.beatText, beat === value && styles.beatTextActive]}>{value + 1}</Text>
          </View>
        ))}
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => onTempoChange(Math.max(40, tempo - 5))} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>−5</Text>
        </Pressable>
        <View style={styles.tempoBox}><Text style={styles.tempo}>{tempo}</Text><Text style={styles.bpm}>BPM</Text></View>
        <Pressable onPress={() => onTempoChange(Math.min(160, tempo + 5))} style={styles.smallButton}>
          <Text style={styles.smallButtonText}>＋5</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setRunning((value) => !value)} style={[styles.play, running && styles.stop]}>
        <Text style={styles.playText}>{running ? '停止节拍器' : '开始节拍器'}</Text>
      </Pressable>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setSoundEnabled((value) => !value)} style={[styles.modeButton, soundEnabled && styles.modeButtonActive]}>
          <Text style={[styles.modeText, soundEnabled && styles.modeTextActive]}>声音 {soundEnabled ? '开' : '关'}</Text>
        </Pressable>
        <Pressable onPress={() => setVibrationEnabled((value) => !value)} style={[styles.modeButton, vibrationEnabled && styles.modeButtonActive]}>
          <Text style={[styles.modeText, vibrationEnabled && styles.modeTextActive]}>振动 {vibrationEnabled ? '开' : '关'}</Text>
        </Pressable>
      </View>
      <Text style={styles.help}>第一拍更响、振动更长。练习时把拨弦落在亮起的数字上。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 14 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.wood, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 3 },
  meter: { color: colors.leaf, fontWeight: '900', fontSize: 15 },
  beats: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  beat: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  beatActive: { backgroundColor: colors.amber, transform: [{ scale: 1.12 }] },
  beatText: { color: colors.inkMuted, fontWeight: '900', fontSize: 17 },
  beatTextActive: { color: colors.white },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  smallButton: { backgroundColor: colors.surfaceMuted, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 9 },
  smallButtonText: { color: colors.woodDark, fontWeight: '900', fontSize: 15 },
  tempoBox: { minWidth: 82, alignItems: 'center' },
  tempo: { color: colors.woodDark, fontSize: 34, fontWeight: '900' },
  bpm: { color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  play: { backgroundColor: colors.leaf, borderRadius: 14, alignItems: 'center', paddingVertical: 13 },
  stop: { backgroundColor: colors.wood },
  playText: { color: colors.white, fontWeight: '900', fontSize: 15 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  modeButton: { borderRadius: 16, backgroundColor: colors.surfaceMuted, paddingHorizontal: 14, paddingVertical: 8 },
  modeButtonActive: { backgroundColor: colors.leafSoft },
  modeText: { color: colors.inkMuted, fontSize: 12, fontWeight: '800' },
  modeTextActive: { color: colors.leaf },
  help: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});

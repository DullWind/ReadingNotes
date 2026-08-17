import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PracticeExercise, UkuleleString } from '../types';

const strings: { id: UkuleleString; label: string }[] = [
  { id: 1, label: 'A' }, { id: 2, label: 'E' }, { id: 3, label: 'C' }, { id: 4, label: 'G' },
];

export function TabScore({ exercise, activeIndex, onSelect }: {
  exercise: PracticeExercise;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>练习谱</Text>
      <Text style={styles.help}>从上到下是 A、E、C、G 弦；0 表示空弦，其他数字表示品位。</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.score}>
        <View>
          {strings.map((string) => (
            <View key={string.id} style={styles.row}>
              <Text style={styles.stringLabel}>{string.label}</Text>
              {exercise.events.map((item, index) => {
                const current = item.notes.find((value) => value.string === string.id);
                return (
                  <Pressable
                    key={item.id + '-' + string.id}
                    onPress={() => onSelect(index)}
                    style={[styles.cell, index === activeIndex && styles.cellActive]}
                  >
                    <View style={styles.line} />
                    <Text style={[styles.fret, index === activeIndex && styles.fretActive]}>
                      {current ? current.fret : '—'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={styles.cues}>
            <Text style={styles.stringLabel}>拍</Text>
            {exercise.events.map((item, index) => (
              <Text key={'cue-' + item.id} style={[styles.cue, index === activeIndex && styles.cueActive]}>
                {item.durationBeats === 0.5 ? (index % 2 ? '和' : String(Math.floor(index / 2) + 1)) : index + 1}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 8 },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  help: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  score: { paddingVertical: 8, paddingRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  stringLabel: { width: 28, color: colors.wood, fontWeight: '900', textAlign: 'center' },
  cell: { width: 48, height: 38, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cellActive: { backgroundColor: colors.leafSoft, borderRadius: 8 },
  line: { position: 'absolute', left: 0, right: 0, top: 18, height: 1, backgroundColor: colors.inkMuted },
  fret: { minWidth: 22, paddingHorizontal: 5, textAlign: 'center', color: colors.ink, backgroundColor: colors.surface, fontWeight: '900' },
  fretActive: { color: colors.leaf },
  cues: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cue: { width: 48, textAlign: 'center', color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  cueActive: { color: colors.leaf },
});

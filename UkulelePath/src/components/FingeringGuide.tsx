import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getChordShape } from '../data/foundations';
import { colors } from '../theme';
import { ExerciseEvent, UkuleleString } from '../types';

const stringOrder: UkuleleString[] = [4, 3, 2, 1];
const stringLabels = ['G', 'C', 'E', 'A'];

export function FingeringGuide({ event }: { event: ExerciseEvent }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const chord = getChordShape(event.chordId);
  const isChord = Boolean(chord);

  useEffect(() => {
    pulse.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 480, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [event.id, pulse]);

  const animatedStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.12] }) }],
  };

  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.kicker}>{isChord ? '和弦手型' : '拨弦引导'}</Text>
          <Text style={styles.title}>{chord ? chord.name + ' 和弦' : event.cue}</Text>
        </View>
        <Text style={styles.fingerLegend}>1食 · 2中 · 3无名 · 4小</Text>
      </View>
      <View style={styles.fretboard}>
        {[0, 1, 2, 3, 4].map((value) => <View key={'fret-' + value} style={[styles.fretLine, { top: 40 + value * 38 }]} />)}
        {stringOrder.map((string, index) => (
          <View key={'string-' + string} style={[styles.string, { left: 32 + index * 60 }]} />
        ))}
        {stringLabels.map((label, index) => (
          <Text key={label} style={[styles.stringName, { left: 21 + index * 60 }]}>{label}</Text>
        ))}
        {event.notes.map((item) => {
          const stringIndex = stringOrder.indexOf(item.string);
          const left = 17 + stringIndex * 60;
          const top = item.fret === 0 ? 10 : 44 + (item.fret - 1) * 38;
          const isOpenString = item.fret === 0;
          const shouldPulse = !isChord || !isOpenString;
          return (
            <Animated.View
              key={item.string + '-' + item.fret}
              style={[
                styles.marker,
                isOpenString && isChord && styles.openMarker,
                { left, top },
                shouldPulse && animatedStyle,
              ]}
            >
              <Text style={[styles.markerText, isOpenString && isChord && styles.openMarkerText]}>
                {isOpenString ? (isChord ? '0' : '拨') : item.finger || item.fret}
              </Text>
            </Animated.View>
          );
        })}
      </View>
      <Text style={styles.cue}>
        {chord
          ? chord.tip + ' 绿色圆点是落指位置；白色 0 是空弦，不用按。'
          : event.cue + '。闪动圆点所在的弦是这一步要拨的弦；0 表示不按品。'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  kicker: { color: colors.wood, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  fingerLegend: { color: colors.inkMuted, fontSize: 10, maxWidth: 100, textAlign: 'right', lineHeight: 15 },
  fretboard: { width: 252, height: 230, alignSelf: 'center', position: 'relative' },
  fretLine: { position: 'absolute', left: 32, right: 40, height: 2, backgroundColor: colors.woodSoft },
  string: { position: 'absolute', top: 40, width: 2, height: 152, backgroundColor: colors.inkMuted },
  stringName: { position: 'absolute', top: 204, width: 24, textAlign: 'center', color: colors.woodDark, fontWeight: '900' },
  marker: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.leaf, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  markerText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  openMarker: { backgroundColor: colors.surface, borderColor: colors.inkMuted, borderWidth: 2 },
  openMarkerText: { color: colors.inkMuted },
  cue: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});

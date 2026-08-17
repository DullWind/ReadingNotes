import { StatusBar } from 'expo-status-bar';
import * as DocumentPicker from 'expo-document-picker';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Dispatch, PropsWithChildren, SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  Alert, Pressable, SafeAreaView, ScrollView, StyleProp, StyleSheet,
  Text, View, ViewStyle,
} from 'react-native';
import { song } from './src/data/song';
import {
  createDailyPlan, currentSection, overallMastery, sectionMastery, suggestedTempo,
} from './src/services/planner';
import { defaultProgress, loadProgress, saveProgress } from './src/storage';
import { cardShadow, colors } from './src/theme';
import { TabId, UserProgress } from './src/types';

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'today', icon: '⌂', label: '今日' },
  { id: 'roadmap', icon: '⌁', label: '路线' },
  { id: 'practice', icon: '♪', label: '练习' },
  { id: 'library', icon: '▤', label: '曲库' },
];

function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Pill({ label, green = false }: { label: string; green?: boolean }) {
  return (
    <View style={[styles.pill, green && styles.pillGreen]}>
      <Text style={[styles.pillText, green && styles.pillTextGreen]}>{label}</Text>
    </View>
  );
}

function Progress({ value, light = false }: { value: number; light?: boolean }) {
  return (
    <View style={[styles.progressTrack, light && styles.progressTrackLight]}>
      <View style={[styles.progressFill, { width: (String(Math.max(0, Math.min(100, value))) + '%') as any }]} />
    </View>
  );
}

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.button, disabled && styles.disabled, pressed && styles.pressed,
    ]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>木弦日课</Text>
        <Text style={styles.headerTitle}>向《幻化成风》前进</Text>
      </View>
      <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>Android 首版</Text></View>
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabId>('today');
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadProgress().then((value) => {
      setProgress(value);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) saveProgress(progress).catch(() => undefined);
  }, [progress, ready]);

  const plan = useMemo(() => createDailyPlan(progress), [progress]);

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <Header />
      <View style={styles.body}>
        {tab === 'today' && <Today progress={progress} setProgress={setProgress} goPractice={() => setTab('practice')} />}
        {tab === 'roadmap' && <Roadmap progress={progress} />}
        {tab === 'practice' && <Practice progress={progress} setProgress={setProgress} />}
        {tab === 'library' && <Library progress={progress} setProgress={setProgress} />}
      </View>
      <View style={styles.nav}>
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <Pressable key={item.id} onPress={() => setTab(item.id)} style={styles.navItem}>
              <Text style={[styles.navIcon, active && styles.navActive]}>{item.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

type ProgressSetter = Dispatch<SetStateAction<UserProgress>>;

function Today({ progress, setProgress, goPractice }: {
  progress: UserProgress; setProgress: ProgressSetter; goPractice: () => void;
}) {
  const plan = createDailyPlan(progress);
  const mastery = overallMastery(progress.results);
  const section = currentSection(progress.results);
  const total = plan.reduce((sum, item) => sum + item.minutes, 0);
  const done = progress.completedTaskIds.length;

  function toggle(id: string) {
    setProgress((current) => ({
      ...current,
      completedTaskIds: current.completedTaskIds.includes(id)
        ? current.completedTaskIds.filter((value) => value !== id)
        : current.completedTaskIds.concat(id),
    }));
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroCircleOne} /><View style={styles.heroCircleTwo} />
        <Text style={styles.heroKicker}>阶段目标</Text>
        <Text style={styles.heroTitle}>完整流畅地弹出{String.fromCharCode(10)}《幻化成风》</Text>
        <View style={styles.heroProgress}>
          <View style={styles.flex}><Progress value={mastery} light /><Text style={styles.heroNote}>综合掌握度 · {mastery}%</Text></View>
          <View style={styles.score}><Text style={styles.scoreText}>{mastery}</Text></View>
        </View>
      </View>

      <View style={styles.titleRow}>
        <View><Text style={styles.eyebrow}>为你动态安排</Text><Text style={styles.sectionTitle}>今天练什么</Text></View>
        <Text style={styles.mutedBold}>{total} 分钟</Text>
      </View>

      <Card style={styles.focusCard}>
        <View style={styles.titleRow}><Pill label={'当前章节 · ' + section.order + '/6'} green /><Text style={styles.tempoSmall}>{suggestedTempo(section, progress.results)} BPM</Text></View>
        <Text style={styles.focusTitle}>{section.title}</Text>
        <Text style={styles.paragraph}>{section.focus}</Text>
      </Card>

      {plan.map((task, index) => {
        const completed = progress.completedTaskIds.includes(task.id);
        return (
          <Pressable key={task.id} onPress={() => toggle(task.id)}>
            <Card style={[styles.task, completed && styles.taskDone]}>
              <View style={[styles.taskNumber, completed && styles.taskNumberDone]}>
                <Text style={[styles.taskNumberText, completed && styles.white]}>{completed ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.flex}>
                <View style={styles.titleRow}><Text style={[styles.taskTitle, completed && styles.strike]}>{task.title}</Text><Text style={styles.taskTime}>{task.minutes} 分</Text></View>
                <Text style={styles.taskDetail}>{task.detail}</Text>
                <Text style={styles.reason}>为何安排：{task.reason}</Text>
              </View>
            </Card>
          </Pressable>
        );
      })}

      <Button label={done >= plan.length ? '今日练习已完成' : '开始今日主练习'} onPress={goPractice} />
    </ScrollView>
  );
}

function Roadmap({ progress }: { progress: UserProgress }) {
  const active = currentSection(progress.results);
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <PageTitle title="学习路线" subtitle="每一站都为完整演奏服务。掌握度达到 78% 后进入下一段。" />
      {song.sections.map((section, index) => {
        const mastery = sectionMastery(section, progress.results);
        const current = section.id === active.id;
        const locked = section.order > active.order + 1;
        return (
          <View key={section.id} style={styles.roadRow}>
            <View style={styles.rail}>
              <View style={[styles.dot, current && styles.dotActive, mastery >= 78 && styles.dotDone]}>
                <Text style={styles.dotText}>{mastery >= 78 ? '✓' : section.order}</Text>
              </View>
              {index < song.sections.length - 1 && <View style={styles.line} />}
            </View>
            <Card style={[styles.roadCard, current && styles.roadActive, locked && styles.disabled]}>
              <View style={styles.titleRow}><Text style={styles.roadTitle}>{section.title}</Text><Pill label={locked ? '稍后解锁' : current ? '正在学习' : mastery + '%'} green={current} /></View>
              <Text style={styles.paragraph}>{section.measureRange} · {section.subtitle}</Text>
              <View style={styles.tags}>{section.skills.map((skill) => <Pill key={skill} label={skill} />)}</View>
              <Progress value={mastery} />
            </Card>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Practice({ progress, setProgress }: { progress: UserProgress; setProgress: ProgressSetter }) {
  const section = currentSection(progress.results);
  const [tempo, setTempo] = useState(suggestedTempo(section, progress.results));
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (progress.audioUri) player.replace({ uri: progress.audioUri });
  }, [player, progress.audioUri]);

  useEffect(() => {
    const playbackRate = Math.max(0.5, Math.min(1, tempo / song.targetTempo));
    player.setPlaybackRate(playbackRate, 'high');
  }, [player, tempo]);

  function record(rating: 1 | 2 | 3) {
    const now = new Date().toISOString();
    setProgress((current) => ({
      ...current,
      results: current.results.concat({
        id: section.id + '-' + now, sectionId: section.id, completedAt: now,
        rating, tempo, durationMinutes: 8,
      }),
    }));
    const messages = {
      1: '明天会自动降速，并增加动作拆解练习。',
      2: '保持当前速度，再巩固一次。',
      3: '很好，下一次会适度提速。',
    };
    Alert.alert('练习已记录', messages[rating]);
  }

  const duration = status.duration || 0;
  const position = status.currentTime || 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <PageTitle title="专注练习" subtitle="先求清楚和连贯，再追求速度。" />
      <Card style={styles.practiceHero}>
        <Pill label={'第 ' + section.order + ' 阶段'} green />
        <Text style={styles.practiceTitle}>{section.title}</Text>
        <Text style={styles.paragraph}>{section.focus}</Text>
        <View style={styles.tempoControl}>
          <Pressable onPress={() => setTempo(Math.max(40, tempo - 5))} style={styles.roundButton}><Text style={styles.roundText}>−</Text></Pressable>
          <View style={styles.tempoCenter}><Text style={styles.tempoValue}>{tempo}</Text><Text style={styles.tempoLabel}>BPM · {Math.round(tempo / song.targetTempo * 100)}% 速度</Text></View>
          <Pressable onPress={() => setTempo(Math.min(section.targetTempo, tempo + 5))} style={styles.roundButton}><Text style={styles.roundText}>＋</Text></Pressable>
        </View>
      </Card>

      <Card>
        <View style={styles.titleRow}>
          <View style={styles.flex}><Text style={styles.eyebrow}>本机原曲</Text><Text numberOfLines={1} style={styles.audioName}>{progress.audioName || '尚未导入音频'}</Text></View>
          <Text style={styles.time}>{formatTime(position)} / {formatTime(duration)}</Text>
        </View>
        <Progress value={duration ? position / duration * 100 : 0} />
        <View style={styles.audioButtons}>
          <Button disabled={!progress.audioUri} label={status.playing ? '暂停' : '播放跟练'} onPress={() => status.playing ? player.pause() : player.play()} />
          <Pressable disabled={!progress.audioUri} onPress={() => player.seekTo(0)}><Text style={[styles.link, !progress.audioUri && styles.disabled]}>回到开头</Text></Pressable>
        </View>
      </Card>

      <View><Text style={styles.question}>这一次弹得怎么样？</Text><Text style={styles.paragraph}>你的选择会直接调整下一次计划。</Text></View>
      <View style={styles.ratingRow}>
        {[
          { value: 1 as const, icon: '↺', label: '需要加强' },
          { value: 2 as const, icon: '○', label: '基本完成' },
          { value: 3 as const, icon: '✦', label: '流畅完成' },
        ].map((item) => (
          <Pressable key={item.value} onPress={() => record(item.value)} style={styles.rating}>
            <Text style={styles.ratingIcon}>{item.icon}</Text><Text style={styles.ratingText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function Library({ progress, setProgress }: { progress: UserProgress; setProgress: ProgressSetter }) {
  async function pickAudio() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/flac', 'audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProgress((current) => ({ ...current, audioUri: asset.uri, audioName: asset.name }));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <PageTitle title="我的曲库" subtitle="首版从一首真正想学会的歌开始。" />
      <Card style={styles.songCard}>
        <View style={styles.album}><View style={styles.sun} /><Text style={styles.note}>♪</Text><View style={styles.hillOne} /><View style={styles.hillTwo} /></View>
        <View style={styles.songInfo}><Pill label="当前目标" green /><Text style={styles.songTitle}>{song.title}</Text><Text style={styles.songOriginal}>{song.originalTitle} · {song.artist}</Text><Text style={styles.paragraph}>{song.arrangement}</Text></View>
      </Card>
      <Card>
        <Text style={styles.eyebrow}>原曲文件</Text>
        <Text style={styles.importTitle}>{progress.audioName || '导入你合法取得的音乐文件'}</Text>
        <Text style={styles.importHelp}>支持 MP3、M4A、WAV、FLAC。文件只保存在你的设备中，不会上传。</Text>
        <Button label={progress.audioUri ? '更换音频' : '从手机选择音频'} onPress={pickAudio} />
      </Card>
      <Card>
        <View style={styles.titleRow}><Text style={styles.eyebrow}>歌曲学习包</Text><Pill label="结构已就绪" green /></View>
        <PackageItem done label="6 个渐进学习阶段" />
        <PackageItem done label="动态速度与薄弱项复习" />
        <PackageItem label="PDF 小节与指法数据待录入" />
        <PackageItem label="音频段落时间点待标注" />
      </Card>
    </ScrollView>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <View style={styles.pageTitleBox}><Text style={styles.pageTitle}>{title}</Text><Text style={styles.paragraph}>{subtitle}</Text></View>;
}

function PackageItem({ done = false, label }: { done?: boolean; label: string }) {
  return <View style={styles.packageRow}><Text style={done ? styles.check : styles.pending}>{done ? '✓' : '○'}</Text><Text style={styles.packageText}>{label}</Text></View>;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  flex: { flex: 1 },
  white: { color: colors.white },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  header: { minHeight: 76, paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.wood, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  headerTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 2 },
  headerBadge: { backgroundColor: '#F1DFC8', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 },
  headerBadgeText: { color: colors.woodDark, fontSize: 11, fontWeight: '800' },
  scroll: { paddingHorizontal: 18, paddingBottom: 28, gap: 15 },
  card: { backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 18, ...cardShadow },
  hero: { overflow: 'hidden', minHeight: 230, borderRadius: 28, padding: 22, backgroundColor: colors.woodDark },
  heroCircleOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -68, top: -48, backgroundColor: colors.wood },
  heroCircleTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: 48, bottom: -85, backgroundColor: colors.leaf },
  heroKicker: { color: '#EBCFAE', fontWeight: '900', letterSpacing: 2, fontSize: 12 },
  heroTitle: { color: colors.white, fontSize: 28, lineHeight: 38, fontWeight: '900', marginTop: 10 },
  heroProgress: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 28 },
  heroNote: { color: '#E6D8CB', fontSize: 12, marginTop: 8 },
  score: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amber, borderWidth: 3, borderColor: '#F4C98C' },
  scoreText: { color: colors.white, fontSize: 19, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eyebrow: { color: colors.leaf, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 3 },
  mutedBold: { color: colors.inkMuted, fontWeight: '800' },
  focusCard: { backgroundColor: '#EEF0E6', borderColor: '#D4DDCB' },
  focusTitle: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 12 },
  paragraph: { color: colors.inkMuted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  tempoSmall: { color: colors.leaf, fontWeight: '900' },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, backgroundColor: colors.surfaceMuted },
  pillGreen: { backgroundColor: colors.leafSoft },
  pillText: { color: colors.inkMuted, fontSize: 11, fontWeight: '800' },
  pillTextGreen: { color: colors.leaf },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 99, backgroundColor: colors.surfaceMuted },
  progressTrackLight: { backgroundColor: 'rgba(255,255,255,0.22)' },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.amber },
  button: { minHeight: 49, paddingHorizontal: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.wood },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  task: { flexDirection: 'row', gap: 13, padding: 14, borderRadius: 18 },
  taskDone: { opacity: 0.6, backgroundColor: '#F5F2EA' },
  taskNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECD9C5' },
  taskNumberDone: { backgroundColor: colors.leaf },
  taskNumberText: { color: colors.woodDark, fontWeight: '900' },
  taskTitle: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '900' },
  taskTime: { color: colors.wood, fontSize: 12, fontWeight: '900' },
  taskDetail: { color: colors.inkMuted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  reason: { color: colors.leaf, fontSize: 11, lineHeight: 16, marginTop: 7 },
  strike: { textDecorationLine: 'line-through' },
  pageTitleBox: { marginTop: 4, marginBottom: 2 },
  pageTitle: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  roadRow: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: 42, alignItems: 'center' },
  dot: { zIndex: 2, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C9B9AA', borderWidth: 2, borderColor: colors.line },
  dotActive: { backgroundColor: colors.amber, borderColor: '#F0C58D' },
  dotDone: { backgroundColor: colors.leaf, borderColor: colors.leaf },
  dotText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  line: { position: 'absolute', top: 28, bottom: -18, width: 2, backgroundColor: colors.line },
  roadCard: { flex: 1, marginBottom: 12, padding: 16 },
  roadActive: { borderColor: colors.amber, borderWidth: 2 },
  roadTitle: { flex: 1, color: colors.ink, fontSize: 17, fontWeight: '900' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12 },
  practiceHero: { backgroundColor: '#EEF0E6', borderColor: '#D4DDCB' },
  practiceTitle: { color: colors.ink, fontSize: 26, fontWeight: '900', marginTop: 12 },
  tempoControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 22 },
  roundButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  roundText: { color: colors.woodDark, fontSize: 25, fontWeight: '800' },
  tempoCenter: { minWidth: 120, alignItems: 'center' },
  tempoValue: { color: colors.woodDark, fontSize: 36, fontWeight: '900' },
  tempoLabel: { color: colors.inkMuted, fontSize: 11, fontWeight: '700' },
  audioName: { color: colors.ink, fontWeight: '800', marginTop: 4, maxWidth: 210 },
  time: { color: colors.inkMuted, fontSize: 11 },
  audioButtons: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 16 },
  link: { color: colors.wood, fontWeight: '900' },
  question: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  ratingRow: { flexDirection: 'row', gap: 8 },
  rating: { flex: 1, minHeight: 88, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  ratingIcon: { color: colors.wood, fontSize: 22, fontWeight: '900' },
  ratingText: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 7 },
  songCard: { flexDirection: 'row', gap: 16 },
  album: { overflow: 'hidden', width: 112, height: 132, borderRadius: 18, backgroundColor: '#E8C993' },
  sun: { position: 'absolute', width: 34, height: 34, borderRadius: 17, right: 15, top: 14, backgroundColor: '#F8E6B8' },
  note: { position: 'absolute', zIndex: 2, left: 44, top: 45, color: colors.woodDark, fontSize: 37, fontWeight: '900' },
  hillOne: { position: 'absolute', width: 150, height: 80, borderRadius: 80, left: -55, bottom: -28, backgroundColor: colors.leaf },
  hillTwo: { position: 'absolute', width: 150, height: 80, borderRadius: 80, right: -70, bottom: -38, backgroundColor: '#7E8E6F' },
  songInfo: { flex: 1, justifyContent: 'center' },
  songTitle: { color: colors.ink, fontSize: 24, fontWeight: '900', marginTop: 9 },
  songOriginal: { color: colors.wood, fontSize: 13, fontWeight: '800', marginTop: 4 },
  importTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 8 },
  importHelp: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginVertical: 8, marginBottom: 16 },
  packageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 13 },
  check: { color: colors.leaf, fontWeight: '900' },
  pending: { color: colors.amber, fontWeight: '900' },
  packageText: { color: colors.inkMuted, fontSize: 14 },
  nav: { minHeight: 70, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIcon: { color: '#A89588', fontSize: 21, fontWeight: '900' },
  navLabel: { color: '#A89588', fontSize: 11, fontWeight: '700' },
  navActive: { color: colors.wood },
});

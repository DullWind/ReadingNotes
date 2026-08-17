import {
  ChordShape, ExerciseEvent, FoundationLesson, FrettedNote, PracticeExercise,
} from '../types';

const note = (
  string: FrettedNote['string'],
  fret: number,
  name: string,
  finger?: FrettedNote['finger'],
): FrettedNote => ({ string, fret, name, finger });

const event = (
  id: string,
  durationBeats: number,
  notes: FrettedNote[],
  cue: string,
  chordId?: string,
): ExerciseEvent => ({ id, durationBeats, notes, cue, chordId });

export const chordShapes: ChordShape[] = [
  {
    id: 'C', name: 'C',
    notes: [note(4, 0, 'G'), note(3, 0, 'C'), note(2, 0, 'E'), note(1, 3, 'C', 3)],
    tip: '无名指按 1 弦 3 品，其余三根弦保持空弦。',
  },
  {
    id: 'Am', name: 'Am',
    notes: [note(4, 2, 'A', 2), note(3, 0, 'C'), note(2, 0, 'E'), note(1, 0, 'A')],
    tip: '中指按 4 弦 2 品，指尖竖起，不要碰到旁边的弦。',
  },
  {
    id: 'F', name: 'F',
    notes: [note(4, 2, 'A', 2), note(3, 0, 'C'), note(2, 1, 'F', 1), note(1, 0, 'A')],
    tip: '食指按 2 弦 1 品，中指按 4 弦 2 品，两根手指一起落下。',
  },
  {
    id: 'G7', name: 'G7',
    notes: [note(4, 0, 'G'), note(3, 2, 'D', 2), note(2, 1, 'F', 1), note(1, 2, 'B', 3)],
    tip: '食指按 2 弦 1 品，中指按 3 弦 2 品，无名指按 1 弦 2 品。',
  },
];

const chordEvent = (id: string, chordId: string): ExerciseEvent => {
  const chord = chordShapes.find((item) => item.id === chordId);
  if (!chord) throw new Error('Unknown chord: ' + chordId);
  return event(id, 4, chord.notes, chordId + ' 和弦保持四拍', chordId);
};

export const foundationExercises: PracticeExercise[] = [
  {
    id: 'steady-quarter-notes', title: '四拍空弦', subtitle: '跟着 60 BPM，每拍拨一次 3 弦空弦',
    tempo: 60, meter: '4/4',
    events: [1, 2, 3, 4].map((beat) => event(
      'quarter-' + beat, 1, [note(3, 0, 'C')], '第 ' + beat + ' 拍：拨弦',
    )),
  },
  {
    id: 'steady-eighth-notes', title: '一拍两个音', subtitle: '数字拍与“和”各拨一次，保持间距相等',
    tempo: 60, meter: '4/4',
    events: Array.from({ length: 8 }, (_, index) => event(
      'eighth-' + index, 0.5, [note(3, 0, 'C')],
      (Math.floor(index / 2) + 1) + (index % 2 ? ' 和' : ' 拍'),
    )),
  },
  {
    id: 'twinkle-opening', title: '《小星星》开头', subtitle: '用熟悉的旋律认识 TAB 的弦号与品位',
    tempo: 60, meter: '4/4',
    events: [
      event('twinkle-c1', 1, [note(3, 0, 'C')], '3 弦空弦 C'),
      event('twinkle-c2', 1, [note(3, 0, 'C')], '3 弦空弦 C'),
      event('twinkle-g1', 1, [note(2, 3, 'G', 3)], '2 弦 3 品 G'),
      event('twinkle-g2', 1, [note(2, 3, 'G', 3)], '2 弦 3 品 G'),
      event('twinkle-a1', 1, [note(1, 0, 'A')], '1 弦空弦 A'),
      event('twinkle-a2', 1, [note(1, 0, 'A')], '1 弦空弦 A'),
      event('twinkle-g3', 2, [note(2, 3, 'G', 3)], '2 弦 3 品 G，保持两拍'),
    ],
  },
  {
    id: 'first-chords', title: '四个基础和弦', subtitle: '先摆好手型，再从 4 弦向 1 弦轻扫',
    tempo: 60, meter: '4/4',
    events: ['C', 'Am', 'F', 'G7'].map((chordId) => chordEvent('shape-' + chordId, chordId)),
  },
  {
    id: 'chord-changes', title: 'C–Am–F–G7 转换', subtitle: '每个和弦保持四拍，提前观察下一个手型',
    tempo: 60, meter: '4/4',
    events: ['C', 'Am', 'F', 'G7'].map((chordId) => chordEvent('change-' + chordId, chordId)),
  },
  {
    id: 'fingerstyle-four-strings', title: '四弦分解拨弦', subtitle: '拇指、食指、中指依次找到自己的弦',
    tempo: 60, meter: '4/4',
    events: [
      event('finger-g', 1, [note(4, 0, 'G')], '拇指拨 4 弦'),
      event('finger-c', 1, [note(3, 0, 'C')], '拇指拨 3 弦'),
      event('finger-e', 1, [note(2, 0, 'E')], '食指拨 2 弦'),
      event('finger-a', 1, [note(1, 0, 'A')], '中指拨 1 弦'),
    ],
  },
];

export const foundationLessons: FoundationLesson[] = [
  {
    id: 'pulse', order: 1, title: '先找到稳定的拍子', summary: '认识一拍和 4/4 拍',
    concept: '节拍器每响一下就是一拍。先拍手，再把每一下拍手换成一次拨弦。',
    goal: '在 60 BPM 下连续拨四拍，不抢拍也不拖拍。', exerciseId: 'steady-quarter-notes',
    checks: ['能跟着数 1、2、3、4', '每次拨弦都落在节拍上', '肩膀和手腕保持放松'],
  },
  {
    id: 'subdivision', order: 2, title: '一拍里面放两个音', summary: '认识均匀的八分音符',
    concept: '一拍可以平均分成两半，读作“1 和、2 和、3 和、4 和”。',
    goal: '在每两次节拍器声音之间，均匀地拨出两个音。', exerciseId: 'steady-eighth-notes',
    checks: ['能稳定读出“数字、和”', '八个音的间距基本相等', '没有因为加音而越弹越快'],
  },
  {
    id: 'tab', order: 3, title: '看懂第一段 TAB', summary: '认识弦、品位和保持时间',
    concept: 'TAB 最上面是离地面最近的 1 弦 A，数字 0 表示空弦，数字 3 表示按第 3 品。',
    goal: '看着 TAB 弹出《小星星》开头，并知道每个数字代表什么。', exerciseId: 'twinkle-opening',
    checks: ['能找到 1、2、3、4 弦', '知道 0 是空弦', '按 3 品时声音清楚'],
  },
  {
    id: 'chord-shapes', order: 4, title: '认识四个基础和弦', summary: 'C、Am、F、G7 的手型',
    concept: '先逐根检查声音，再轻扫全部琴弦。按弦手指靠近品丝，但不要压在品丝上。',
    goal: '能够独立摆出四个和弦，并让需要发声的琴弦保持清楚。', exerciseId: 'first-chords',
    checks: ['能按动画找到正确弦和品位', '逐根拨弦时没有明显闷音', '按弦手没有疼痛'],
  },
  {
    id: 'chord-changes', order: 5, title: '让和弦连起来', summary: 'C–Am–F–G7 慢速转换',
    concept: '先观察共同手指和最短移动路线。速度不重要，落指整齐和节奏不断更重要。',
    goal: '每四拍更换一次和弦，连续完成一轮。', exerciseId: 'chord-changes',
    checks: ['能提前想到下一个手型', '换和弦时节拍没有完全停下', '至少连续完成两轮'],
  },
  {
    id: 'fingerstyle', order: 6, title: '进入指弹之前', summary: '建立四根弦的右手位置感',
    concept: '拇指负责较粗的 4、3 弦，食指和中指分别照顾 2、1 弦，动作保持小而放松。',
    goal: '不盯着右手也能按 4、3、2、1 弦顺序拨弦。', exerciseId: 'fingerstyle-four-strings',
    checks: ['每根弦都能准确找到', '四个音音量接近', '连续三轮没有碰错弦'],
  },
];

export function getFoundationExercise(exerciseId: string) {
  return foundationExercises.find((exercise) => exercise.id === exerciseId)
    || foundationExercises[0];
}

export function getChordShape(chordId?: string) {
  return chordShapes.find((chord) => chord.id === chordId);
}

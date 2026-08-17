export type TabId = 'today' | 'roadmap' | 'practice' | 'library';

export type UkuleleString = 1 | 2 | 3 | 4;

export interface FrettedNote {
  string: UkuleleString;
  fret: number;
  finger?: 1 | 2 | 3 | 4;
  name?: string;
}

export interface ChordShape {
  id: string;
  name: string;
  notes: FrettedNote[];
  tip: string;
}

export interface ExerciseEvent {
  id: string;
  durationBeats: number;
  notes: FrettedNote[];
  chordId?: string;
  cue: string;
}

export interface PracticeExercise {
  id: string;
  title: string;
  subtitle: string;
  tempo: number;
  meter: '4/4';
  events: ExerciseEvent[];
}

export interface FoundationLesson {
  id: string;
  order: number;
  title: string;
  summary: string;
  concept: string;
  goal: string;
  exerciseId: string;
  checks: string[];
}

export type SkillTag =
  | '识谱'
  | '右手拨弦'
  | '左手按弦'
  | '节奏稳定'
  | '换把'
  | '段落衔接'
  | '完整演奏';

export interface SongSection {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  measureRange: string;
  chords: string[];
  targetTempo: number;
  startTempo: number;
  skills: SkillTag[];
  focus: string;
}

export interface PracticeResult {
  id: string;
  sectionId: string;
  completedAt: string;
  rating: 1 | 2 | 3;
  tempo: number;
  durationMinutes: number;
}

export interface UserProgress {
  planDate: string;
  completedTaskIds: string[];
  completedFoundationLessonIds: string[];
  results: PracticeResult[];
  audioUri: string | null;
  audioName: string | null;
  dailyMinutes: number;
}

export interface PlanTask {
  id: string;
  kind: 'warmup' | 'technique' | 'section' | 'review';
  title: string;
  detail: string;
  reason: string;
  minutes: number;
  sectionId?: string;
  lessonId?: string;
  exerciseId?: string;
  tempo?: number;
}

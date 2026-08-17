export type TabId = 'today' | 'roadmap' | 'practice' | 'library';

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
  tempo?: number;
}

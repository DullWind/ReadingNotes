import { song } from '../data/song';
import { foundationLessons } from '../data/foundations';
import { PlanTask, PracticeResult, SongSection, UserProgress } from '../types';

export function dateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return [date.getFullYear(), month, day].join('-');
}

export function sectionResults(results: PracticeResult[], sectionId: string) {
  return results
    .filter((result) => result.sectionId === sectionId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export function sectionMastery(section: SongSection, results: PracticeResult[]) {
  const recent = sectionResults(results, section.id).slice(0, 4);
  if (!recent.length) return 0;
  const rating = recent.reduce((sum, item) => sum + item.rating / 3, 0) / recent.length;
  const bestTempo = Math.max.apply(null, recent.map((item) => item.tempo));
  const tempo = Math.min(bestTempo / section.targetTempo, 1);
  return Math.round((rating * 0.65 + tempo * 0.35) * 100);
}

export function sectionReadyForNext(section: SongSection, results: PracticeResult[]) {
  const successful = sectionResults(results, section.id)
    .filter((result) => result.rating === 3 && result.tempo >= section.targetTempo);
  const practiceDays = new Set(successful.map((result) => result.completedAt.slice(0, 10)));
  return successful.length >= 3 && practiceDays.size >= 2;
}

export function currentSection(results: PracticeResult[]) {
  return song.sections.find((section) => !sectionReadyForNext(section, results))
    || song.sections[song.sections.length - 1];
}

export function suggestedTempo(section: SongSection, results: PracticeResult[]) {
  const latest = sectionResults(results, section.id)[0];
  if (!latest) return section.startTempo;
  if (latest.rating === 3) return Math.min(latest.tempo + 5, section.targetTempo);
  if (latest.rating === 1) return Math.max(section.startTempo, latest.tempo - 5);
  return latest.tempo;
}

export function currentFoundationLesson(completedLessonIds: string[]) {
  return foundationLessons.find((lesson) => !completedLessonIds.includes(lesson.id));
}

export function foundationMastery(completedLessonIds: string[]) {
  const completed = foundationLessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  return Math.round(completed / foundationLessons.length * 100);
}

export function createDailyPlan(progress: UserProgress): PlanTask[] {
  const lesson = currentFoundationLesson(progress.completedFoundationLessonIds);
  if (lesson) {
    return [
      {
        id: 'tune-and-relax', kind: 'warmup', title: '调音与放松检查',
        detail: '确认 G · C · E · A，肩膀放松，按弦手腕不疼痛',
        reason: '正确声音和放松动作比练习速度更重要', minutes: 2,
      },
      {
        id: 'concept-' + lesson.id, kind: 'technique', title: '先理解：' + lesson.title,
        detail: lesson.concept, reason: '先听懂和看懂，再拿琴重复动作',
        minutes: 4, lessonId: lesson.id, exerciseId: lesson.exerciseId, tempo: 60,
      },
      {
        id: 'exercise-' + lesson.id, kind: 'section', title: '基础练习：' + lesson.summary,
        detail: lesson.goal, reason: '这是进入《幻化成风》前的第 ' + lesson.order + ' 项基础能力',
        minutes: Math.max(6, progress.dailyMinutes - 8),
        lessonId: lesson.id, exerciseId: lesson.exerciseId, tempo: 60,
      },
      {
        id: 'listen-and-note', kind: 'review', title: '回听与放松收尾',
        detail: '说出今天最稳定的一次，以及还会卡住的一个动作',
        reason: '学会判断自己的声音，比单纯增加重复次数更有效', minutes: 2,
      },
    ];
  }

  const section = currentSection(progress.results);
  const tempo = suggestedTempo(section, progress.results);
  const latest = sectionResults(progress.results, section.id)[0];
  const weakness = latest && latest.rating === 1;
  return [
    {
      id: 'tune-and-warmup', kind: 'warmup', title: '调音与手指唤醒',
      detail: '确认 G · C · E · A，做慢速空弦拨弦',
      reason: '让耳朵和双手进入稳定状态', minutes: 3,
    },
    {
      id: 'technique-' + section.id, kind: 'technique',
      title: weakness ? '修复昨天的卡点' : '准备：' + section.skills[0],
      detail: weakness ? '把困难动作拆成两拍，连续正确 5 次' : section.focus,
      reason: weakness ? '最近一次练习标记为“需要加强”' : '当前段落需要' + section.skills.join('、'),
      minutes: 4, sectionId: section.id, tempo: Math.max(40, tempo - 10),
    },
    {
      id: 'section-' + section.id, kind: 'section', title: '主练：' + section.title,
      detail: '以 ' + tempo + ' BPM 循环，目标是连续 3 次不中断',
      reason: '当前掌握度 ' + sectionMastery(section, progress.results) + '%',
      minutes: Math.max(6, progress.dailyMinutes - 10), sectionId: section.id, tempo,
    },
    {
      id: 'slow-link', kind: 'review', title: '慢速连接与收尾',
      detail: '从已学内容开头连弹一次，出错也尽量不断',
      reason: '把局部动作逐渐变成完整演奏能力',
      minutes: 3, sectionId: section.id, tempo: Math.max(45, tempo - 15),
    },
  ];
}

export function overallMastery(results: PracticeResult[]) {
  const sum = song.sections.reduce((total, section) => total + sectionMastery(section, results), 0);
  return Math.round(sum / song.sections.length);
}

import { song } from '../data/song';
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

export function currentSection(results: PracticeResult[]) {
  return song.sections.find((section) => sectionMastery(section, results) < 78)
    || song.sections[song.sections.length - 1];
}

export function suggestedTempo(section: SongSection, results: PracticeResult[]) {
  const latest = sectionResults(results, section.id)[0];
  if (!latest) return section.startTempo;
  if (latest.rating === 3) return Math.min(latest.tempo + 5, section.targetTempo);
  if (latest.rating === 1) return Math.max(section.startTempo, latest.tempo - 5);
  return latest.tempo;
}

export function createDailyPlan(progress: UserProgress): PlanTask[] {
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

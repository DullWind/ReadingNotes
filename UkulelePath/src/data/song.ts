import { SongSection } from '../types';

export const song = {
  id: 'kaze-ni-naru-fingerstyle-v1',
  title: '幻化成风',
  originalTitle: '風になる',
  artist: '辻亚弥乃',
  arrangement: '尤克里里指弹 · 目标谱版本',
  key: 'C',
  meter: '4/4',
  targetTempo: 120,
  sections: [
    {
      id: 'measures-1-4', order: 1, title: '开头主题', subtitle: '建立旋律与伴奏的层次',
      measureRange: '小节 1–4', chords: ['C', 'F', 'Dm', 'Bb'],
      startTempo: 50, targetTempo: 75, skills: ['识谱', '右手拨弦'],
      focus: '先读准休止与弱起，让旋律音比伴奏音更清楚。',
    },
    {
      id: 'measures-5-9', order: 2, title: '第一反复段', subtitle: '稳定八分音符与和弦转换',
      measureRange: '小节 5–9', chords: ['C', 'Am7', 'Dm', 'Bb'],
      startTempo: 55, targetTempo: 85, skills: ['右手拨弦', '节奏稳定'],
      focus: '保持八分音符均匀，注意反复记号前后的连贯。',
    },
    {
      id: 'measures-10-14', order: 3, title: '第二展开段', subtitle: '处理一、二房结尾',
      measureRange: '小节 10–14', chords: ['Bb', 'C', 'F', 'Bbm'],
      startTempo: 50, targetTempo: 85, skills: ['左手按弦', '段落衔接'],
      focus: '分清一房与二房结尾，并单独练习 Bbm 的落指。',
    },
    {
      id: 'measures-15-19', order: 4, title: '转折和弦段', subtitle: '连续转换与半音和弦',
      measureRange: '小节 15–19', chords: ['D7', 'F', 'G7', 'C', 'Dm7', 'D#dim', 'C7'],
      startTempo: 50, targetTempo: 90, skills: ['节奏稳定', '换把'],
      focus: '这是和弦最密集的段落，先练 Dm7–D#dim–C7 的连续转换。',
    },
    {
      id: 'measures-20-24', order: 5, title: '高把位旋律', subtitle: '跨弦与 7–8 品换把',
      measureRange: '小节 20–24', chords: ['F', 'C', 'Dm', 'Am', 'Bb'],
      startTempo: 45, targetTempo: 95, skills: ['换把', '右手拨弦'],
      focus: '提前移动左手，在 7–8 品旋律处保持手腕放松、音符清楚。',
    },
    {
      id: 'measures-25-end', order: 6, title: '结尾与整曲', subtitle: '二房结尾及完整串联',
      measureRange: '小节 25–结尾', chords: ['F', 'G7', 'C'],
      startTempo: 65, targetTempo: 120, skills: ['段落衔接', '完整演奏'],
      focus: '先练两种结尾，再从 75% 速度开始完整演奏，稳定后逐级提速。',
    },
  ] as SongSection[],
};

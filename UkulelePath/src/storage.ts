import Storage from 'expo-sqlite/kv-store';
import { dateKey } from './services/planner';
import { UserProgress } from './types';

const KEY = 'woodstring-progress-v1';

export const defaultProgress: UserProgress = {
  planDate: dateKey(),
  completedTaskIds: [],
  results: [],
  audioUri: null,
  audioName: null,
  dailyMinutes: 20,
};

export async function loadProgress(): Promise<UserProgress> {
  try {
    const raw = await Storage.getItem(KEY);
    if (!raw) return defaultProgress;
    const saved = { ...defaultProgress, ...JSON.parse(raw) } as UserProgress;
    return saved.planDate === dateKey()
      ? saved
      : { ...saved, planDate: dateKey(), completedTaskIds: [] };
  } catch {
    return defaultProgress;
  }
}

export async function saveProgress(progress: UserProgress) {
  await Storage.setItem(KEY, JSON.stringify(progress));
}

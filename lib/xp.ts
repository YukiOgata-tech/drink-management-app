import { UserXP, PersonalDrinkLog } from '@/types';

/**
 * XP付与値の定数
 */
export const XP_VALUES = {
  DRINK_LOG: 10, // 飲酒記録追加
  EVENT_JOIN: 50, // イベント参加
  EVENT_COMPLETE: 30, // イベント完了
  DAILY_BONUS: 5, // 当日初回記録ボーナス
} as const;

/**
 * 指定レベルに必要な累計XP
 * レベル1: 0 XP
 * レベル2: 71 XP
 * レベル5: 559 XP
 * レベル10: 1,581 XP
 * レベル20: 4,472 XP
 * レベル50: 17,678 XP
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(50 * Math.pow(level, 1.5));
}

/**
 * 累計XPからレベルを計算
 */
export function calculateLevel(totalXP: number): number {
  if (totalXP < 0) return 1;

  let level = 1;
  while (xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * 現在レベル内での進捗率を計算（0-100）
 */
export function calculateProgress(totalXP: number): number {
  const currentLevel = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);

  if (nextLevelXP === currentLevelXP) return 100;

  const progressXP = totalXP - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;

  return Math.min(100, Math.max(0, (progressXP / requiredXP) * 100));
}

/**
 * XP情報オブジェクトを取得
 */
export function getXPInfo(totalXP: number, negativeXP: number = 0): UserXP {
  const level = calculateLevel(totalXP);
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const progress = calculateProgress(totalXP);

  return {
    totalXP,
    level,
    currentLevelXP,
    nextLevelXP,
    progress,
    negativeXP,
  };
}

/**
 * 次のレベルまでに必要なXP
 */
export function getXPToNextLevel(totalXP: number): number {
  const level = calculateLevel(totalXP);
  const nextLevelXP = xpForLevel(level + 1);
  return nextLevelXP - totalXP;
}

/**
 * 飲酒記録からXPを計算
 * @param log 飲酒記録
 * @param isFirstOfDay 当日初回かどうか
 */
export function calculateLogXP(log: PersonalDrinkLog, isFirstOfDay: boolean): number {
  let xp = XP_VALUES.DRINK_LOG;

  if (isFirstOfDay) {
    xp += XP_VALUES.DAILY_BONUS;
  }

  return xp;
}

/**
 * レベルアップしたかどうかを判定
 * @param oldXP 変更前のXP
 * @param newXP 変更後のXP
 * @returns レベルアップした場合は新しいレベル、していない場合はnull
 */
export function checkLevelUp(oldXP: number, newXP: number): number | null {
  const oldLevel = calculateLevel(oldXP);
  const newLevel = calculateLevel(newXP);

  if (newLevel > oldLevel) {
    return newLevel;
  }
  return null;
}

import { UserXP, PersonalDrinkLog } from '@/types';

/**
 * XP付与値の定数
 */
export const XP_VALUES = {
  DRINK_LOG: 10, // 飲酒記録追加（純アルコール量ベースの場合は未使用）
  EVENT_JOIN: 50, // イベント参加
  EVENT_COMPLETE: 30, // イベント完了（基本値）
  DAILY_BONUS: 5, // 当日初回記録ボーナス
  XP_PER_GRAM: 1, // 純アルコール1gあたりのXP
  // 参加人数ボーナス
  PARTICIPANT_BONUS_PER_PERSON: 5, // 参加者1人あたりの追加XP
  PARTICIPANT_BONUS_MAX: 50, // 参加人数ボーナスの上限
  // ランキングボーナス
  RANKING_1ST: 100, // 1位ボーナス
  RANKING_2ND: 50, // 2位ボーナス
  RANKING_3RD: 30, // 3位ボーナス
} as const;

/**
 * ランキングに基づくボーナスXPを計算
 * @param rank 順位（1から始まる）
 */
export function getRankingBonus(rank: number): number {
  switch (rank) {
    case 1:
      return XP_VALUES.RANKING_1ST;
    case 2:
      return XP_VALUES.RANKING_2ND;
    case 3:
      return XP_VALUES.RANKING_3RD;
    default:
      return 0;
  }
}

/**
 * 参加人数に基づくボーナスXPを計算
 * @param participantCount 参加者数
 */
export function getParticipantBonus(participantCount: number): number {
  const bonus = (participantCount - 1) * XP_VALUES.PARTICIPANT_BONUS_PER_PERSON;
  return Math.min(bonus, XP_VALUES.PARTICIPANT_BONUS_MAX);
}

/**
 * イベント完了時の総XPを計算
 * @param participantCount 参加者数
 * @param rank 順位（1から始まる、nullの場合はランキングボーナスなし）
 * @param drinkLogsXP 飲酒記録から得たXP
 */
export function calculateEventCompleteXP(
  participantCount: number,
  rank: number | null,
  drinkLogsXP: number
): {
  baseXP: number;
  participantBonus: number;
  rankingBonus: number;
  drinkLogsXP: number;
  totalXP: number;
} {
  const baseXP = XP_VALUES.EVENT_COMPLETE;
  const participantBonus = getParticipantBonus(participantCount);
  const rankingBonus = rank ? getRankingBonus(rank) : 0;

  return {
    baseXP,
    participantBonus,
    rankingBonus,
    drinkLogsXP,
    totalXP: baseXP + participantBonus + rankingBonus + drinkLogsXP,
  };
}

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
 * 飲酒記録からXPを計算（純アルコール量ベース）
 * @param pureAlcoholG 1杯あたりの純アルコール量（g）
 * @param count 杯数
 * @param isFirstOfDay 当日初回かどうか
 */
export function calculateLogXP(pureAlcoholG: number, count: number, isFirstOfDay: boolean): number {
  // 純アルコール量に応じてXPを付与（1g = 1 XP）
  let xp = Math.floor(pureAlcoholG * count * XP_VALUES.XP_PER_GRAM);

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

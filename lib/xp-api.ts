import { supabase } from './supabase';
import { UserXP, XPSource } from '@/types';
import { getXPInfo, calculateLevel, checkLevelUp } from './xp';

export interface XPResponse {
  data: {
    totalXP: number;
    level: number;
    negativeXP: number;
    leveledUp: boolean;
    newLevel?: number;
    debtPaid: number; // 今回相殺した借金XP
  } | null;
  error: { message: string; code?: string } | null;
}

/**
 * ユーザーのXP情報を取得
 */
export async function fetchUserXP(userId: string): Promise<{
  xpInfo: UserXP | null;
  error: { message: string; code?: string } | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_xp, level, negative_xp')
      .eq('id', userId)
      .single();

    if (error) {
      return { xpInfo: null, error: { message: error.message, code: error.code } };
    }

    const xpInfo = getXPInfo(data.total_xp || 0, data.negative_xp || 0);
    return { xpInfo, error: null };
  } catch (err: any) {
    return { xpInfo: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * ユーザーにXPを付与（借金XPがあれば相殺）
 * @param userId ユーザーID
 * @param amount 付与するXP量
 * @param _source XPの発生源（ログ用、将来のトラッキング用）
 */
export async function addXPToProfile(
  userId: string,
  amount: number,
  _source: XPSource
): Promise<XPResponse> {
  try {
    // 現在のXPとnegative_xpを取得
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('total_xp, level, negative_xp')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message, code: fetchError.code } };
    }

    const oldXP = currentData.total_xp || 0;
    const currentNegativeXP = currentData.negative_xp || 0;

    // 借金を相殺
    const debtPaid = Math.min(amount, currentNegativeXP);
    const effectiveAmount = amount - debtPaid;
    const remainingNegativeXP = currentNegativeXP - debtPaid;

    const newXP = oldXP + effectiveAmount;
    const newLevel = calculateLevel(newXP);

    // XP、レベル、借金XPを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_xp: newXP,
        level: newLevel,
        negative_xp: remainingNegativeXP,
      })
      .eq('id', userId);

    if (updateError) {
      return { data: null, error: { message: updateError.message, code: updateError.code } };
    }

    // レベルアップしたかチェック
    const leveledUpTo = checkLevelUp(oldXP, newXP);

    return {
      data: {
        totalXP: newXP,
        level: newLevel,
        negativeXP: remainingNegativeXP,
        leveledUp: leveledUpTo !== null,
        newLevel: leveledUpTo ?? undefined,
        debtPaid,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * 借金XPを追加（記録削除時に呼び出し）
 * @param userId ユーザーID
 * @param amount 追加する借金XP量
 */
export async function addNegativeXP(
  userId: string,
  amount: number
): Promise<{ error: { message: string; code?: string } | null }> {
  try {
    // 現在のnegative_xpを取得
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('negative_xp')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { error: { message: fetchError.message, code: fetchError.code } };
    }

    const currentNegativeXP = currentData.negative_xp || 0;
    const newNegativeXP = currentNegativeXP + amount;

    // 借金XPを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ negative_xp: newNegativeXP })
      .eq('id', userId);

    if (updateError) {
      return { error: { message: updateError.message, code: updateError.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * XP情報をリセット（開発/テスト用）
 */
export async function resetXP(userId: string): Promise<{ error: { message: string; code?: string } | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        total_xp: 0,
        level: 1,
        negative_xp: 0,
      })
      .eq('id', userId);

    if (error) {
      return { error: { message: error.message, code: error.code } };
    }

    return { error: null };
  } catch (err: any) {
    return { error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

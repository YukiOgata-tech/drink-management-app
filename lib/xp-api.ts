import { supabase } from './supabase';
import { UserXP, XPSource } from '@/types';
import { getXPInfo, calculateLevel, checkLevelUp } from './xp';

export interface XPResponse {
  data: {
    totalXP: number;
    level: number;
    leveledUp: boolean;
    newLevel?: number;
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
      .select('total_xp, level')
      .eq('id', userId)
      .single();

    if (error) {
      return { xpInfo: null, error: { message: error.message, code: error.code } };
    }

    const xpInfo = getXPInfo(data.total_xp || 0);
    return { xpInfo, error: null };
  } catch (err: any) {
    return { xpInfo: null, error: { message: err.message || '予期しないエラーが発生しました' } };
  }
}

/**
 * ユーザーにXPを付与
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
    // 現在のXPを取得
    const { data: currentData, error: fetchError } = await supabase
      .from('profiles')
      .select('total_xp, level')
      .eq('id', userId)
      .single();

    if (fetchError) {
      return { data: null, error: { message: fetchError.message, code: fetchError.code } };
    }

    const oldXP = currentData.total_xp || 0;
    const newXP = oldXP + amount;
    const newLevel = calculateLevel(newXP);

    // XPとレベルを更新
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_xp: newXP,
        level: newLevel,
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
        leveledUp: leveledUpTo !== null,
        newLevel: leveledUpTo ?? undefined,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: { message: err.message || '予期しないエラーが発生しました' } };
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

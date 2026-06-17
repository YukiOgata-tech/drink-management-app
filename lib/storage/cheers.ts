import AsyncStorage from '@react-native-async-storage/async-storage';

/** 1イベント・1ユーザーあたりの乾杯回数上限 */
export const MAX_CHEERS_PER_EVENT = 3;

const storageKey = (eventId: string, userId: string) => `cheers:${eventId}:${userId}`;

/**
 * 当該イベントで自分が使った乾杯回数を取得（アプリ再起動後も保持）
 */
export async function getCheersUsed(eventId: string, userId: string): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(storageKey(eventId, userId));
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * 乾杯回数を1つ消費して、消費後の使用回数を返す
 */
export async function incrementCheersUsed(eventId: string, userId: string): Promise<number> {
  const used = await getCheersUsed(eventId, userId);
  const next = used + 1;
  try {
    await AsyncStorage.setItem(storageKey(eventId, userId), String(next));
  } catch {
    // 保存失敗は致命的でないため無視
  }
  return next;
}

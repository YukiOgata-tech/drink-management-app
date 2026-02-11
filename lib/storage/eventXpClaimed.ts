import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY_PREFIX = 'event-xp-claimed:';

/**
 * イベントのXPを既に受け取ったかどうかを確認
 */
export async function hasClaimedEventXP(userId: string, eventId: string): Promise<boolean> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}:${eventId}`;
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch (error) {
    console.error('Error checking event XP claimed status:', error);
    return false;
  }
}

/**
 * イベントのXPを受け取ったことを記録
 */
export async function markEventXPClaimed(userId: string, eventId: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}:${eventId}`;
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('Error marking event XP as claimed:', error);
  }
}

/**
 * イベントのXP受け取り状態をクリア（テスト用）
 */
export async function clearEventXPClaimed(userId: string, eventId: string): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}:${eventId}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing event XP claimed status:', error);
  }
}

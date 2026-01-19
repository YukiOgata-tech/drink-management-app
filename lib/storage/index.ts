import AsyncStorage from '@react-native-async-storage/async-storage';

// ストレージキーのプレフィックス
const STORAGE_PREFIX = {
  app: 'app:',
  auth: 'auth:',
  customDrinks: 'custom-drinks:',
  personalLogs: 'personal-logs:',
} as const;

/**
 * 汎用ストレージヘルパー
 */
export const storage = {
  async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(`${STORAGE_PREFIX.app}${key}`);
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_PREFIX.app}${key}`, value);
  },
  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX.app}${key}`);
  },
};

/**
 * カスタムドリンク用ストレージ
 */
export const customDrinksStorage = {
  async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(`${STORAGE_PREFIX.customDrinks}${key}`);
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_PREFIX.customDrinks}${key}`, value);
  },
  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX.customDrinks}${key}`);
  },
};

/**
 * 個人飲酒記録用ストレージ
 */
export const personalLogsStorage = {
  async getString(key: string): Promise<string | null> {
    return AsyncStorage.getItem(`${STORAGE_PREFIX.personalLogs}${key}`);
  },
  async set(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(`${STORAGE_PREFIX.personalLogs}${key}`, value);
  },
  async delete(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX.personalLogs}${key}`);
  },
};

/**
 * Supabase Auth用のAsyncStorageアダプター
 * Supabaseは標準のAsyncStorage APIを直接受け付ける
 */
export const authStorageAdapter = AsyncStorage;

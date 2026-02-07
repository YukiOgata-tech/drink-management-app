import AsyncStorage from '@react-native-async-storage/async-storage';

const UI_PREFERENCES_KEY = 'ui-preferences';

export interface UIPreferences {
  // 個人記録追加画面のセクション折りたたみ状態
  addPersonalCollapsedSections?: {
    recentDrinks?: boolean;
    popularDrinks?: boolean;
  };
}

/**
 * UI設定を取得
 */
export async function getUIPreferences(): Promise<UIPreferences> {
  try {
    const data = await AsyncStorage.getItem(UI_PREFERENCES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get UI preferences:', error);
    return {};
  }
}

/**
 * UI設定を保存
 */
export async function setUIPreferences(preferences: UIPreferences): Promise<void> {
  try {
    const current = await getUIPreferences();
    const merged = { ...current, ...preferences };
    await AsyncStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to set UI preferences:', error);
  }
}

/**
 * 個人記録追加画面のセクション折りたたみ状態を取得
 */
export async function getAddPersonalCollapsedSections(): Promise<{
  recentDrinks: boolean;
  popularDrinks: boolean;
}> {
  const prefs = await getUIPreferences();
  return {
    recentDrinks: prefs.addPersonalCollapsedSections?.recentDrinks ?? false,
    popularDrinks: prefs.addPersonalCollapsedSections?.popularDrinks ?? false,
  };
}

/**
 * 個人記録追加画面のセクション折りたたみ状態を保存
 */
export async function setAddPersonalCollapsedSection(
  section: 'recentDrinks' | 'popularDrinks',
  collapsed: boolean
): Promise<void> {
  const prefs = await getUIPreferences();
  await setUIPreferences({
    ...prefs,
    addPersonalCollapsedSections: {
      ...prefs.addPersonalCollapsedSections,
      [section]: collapsed,
    },
  });
}

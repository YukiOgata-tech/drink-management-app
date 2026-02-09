import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colorScheme: 'light' | 'dark'; // 実際に適用されるカラースキーム
  isLoaded: boolean;

  // Actions
  setMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'app-theme-mode';

// システムのカラースキームを取得
const getSystemColorScheme = (): 'light' | 'dark' => {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
};

// モードから実際のカラースキームを計算
const resolveColorScheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemColorScheme();
  }
  return mode;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colorScheme: 'light',
  isLoaded: false,

  setMode: async (mode: ThemeMode) => {
    const colorScheme = resolveColorScheme(mode);
    set({ mode, colorScheme });
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  },

  initializeTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode: ThemeMode = (savedMode as ThemeMode) || 'system';
      const colorScheme = resolveColorScheme(mode);
      set({ mode, colorScheme, isLoaded: true });

      // システムのカラースキーム変更を監視
      Appearance.addChangeListener(({ colorScheme: systemScheme }) => {
        const currentMode = get().mode;
        if (currentMode === 'system') {
          set({ colorScheme: systemScheme === 'dark' ? 'dark' : 'light' });
        }
      });
    } catch (error) {
      console.error('Failed to load theme:', error);
      set({ isLoaded: true });
    }
  },
}));

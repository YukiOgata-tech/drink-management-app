import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';

/**
 * イベントストアのエラーを一元表示する共通バナー。
 * 各画面の Alert 乱立を避け、store.error を拾って自動表示・自動消去する。
 */
export function EventErrorBanner() {
  const error = useEventsStore((s) => s.error);
  const clearError = useEventsStore((s) => s.clearError);
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';

  // 一定時間で自動的に消す
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => clearError(), 5000);
    return () => clearTimeout(t);
  }, [error, clearError]);

  if (!error) return null;

  return (
    <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOut.duration(200)}>
      <View
        className="flex-row items-center px-4 py-3"
        style={{ backgroundColor: isDark ? '#7f1d1d' : '#fef2f2' }}
      >
        <Feather name="alert-circle" size={16} color={isDark ? '#fecaca' : '#dc2626'} />
        <Text
          className="flex-1 text-sm ml-2"
          style={{ color: isDark ? '#fecaca' : '#b91c1c' }}
          numberOfLines={2}
        >
          {error}
        </Text>
        <TouchableOpacity onPress={clearError} hitSlop={8}>
          <Feather name="x" size={16} color={isDark ? '#fecaca' : '#dc2626'} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

import { View, Text, Image, ViewStyle } from 'react-native';
import { useThemeStore } from '@/stores/theme';

interface AvatarProps {
  uri?: string | null;
  /** フォールバック表示用の名前（頭文字を表示） */
  name?: string;
  size?: number;
  /** 枠線などの追加スタイル */
  style?: ViewStyle;
}

/**
 * アバター表示。uri があれば画像、無ければ頭文字のプレースホルダを表示する。
 * （アバター未設定ユーザーで画像が空/壊れる問題を防ぐ）
 */
export function Avatar({ uri, name, size = 80, style }: AvatarProps) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';
  const base: ViewStyle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[base, style] as any} />;
  }

  const initial = (name?.trim()?.charAt(0) || '🍺').toUpperCase();
  return (
    <View
      style={[
        base,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#374151' : '#e0f2fe',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: isDark ? '#e5e7eb' : '#0284c7' }}>
        {initial}
      </Text>
    </View>
  );
}

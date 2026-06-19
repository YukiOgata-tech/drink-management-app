import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '@/stores/theme';
import { LottieLoader } from './LottieLoader';

interface LoadingScreenProps {
  message?: string;
  /** SafeAreaView で全画面表示するか（false なら中央寄せの View のみ） */
  fullScreen?: boolean;
}

/**
 * ブランドカラーの中央ローディング表示（処理中・読み込み中）。
 * 素の「読み込み中...」テキストを置き換える共通コンポーネント。
 */
export function LoadingScreen({ message = '読み込み中...', fullScreen = true }: LoadingScreenProps) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';

  const content = (
    <View className="flex-1 items-center justify-center">
      <View
        className="items-center justify-center rounded-3xl px-8 py-7"
        style={{
          backgroundColor: isDark ? 'rgba(31,41,55,0.6)' : 'rgba(255,255,255,0.8)',
        }}
      >
        <LottieLoader size={120} />
        {!!message && (
          <Text className={`mt-3 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );

  if (!fullScreen) return content;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {content}
    </SafeAreaView>
  );
}

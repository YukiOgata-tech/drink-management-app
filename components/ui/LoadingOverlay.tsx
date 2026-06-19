import { Modal, View, Text } from 'react-native';
import { useThemeStore } from '@/stores/theme';
import { LottieLoader } from './LottieLoader';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

/**
 * 処理中・遷移中に最前面へ重ねる全画面ローディングオーバーレイ。
 * 半透明の背景＋中央にdlogo Lottie。表示中は背面の操作をブロックする。
 */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.45)',
        }}
      >
        <View
          style={{
            paddingHorizontal: 28,
            paddingVertical: 24,
            borderRadius: 24,
            alignItems: 'center',
            backgroundColor: isDark ? '#1f2937' : '#ffffff',
          }}
        >
          <LottieLoader size={110} />
          {!!message && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: '600',
                color: isDark ? '#e5e7eb' : '#374151',
              }}
            >
              {message}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

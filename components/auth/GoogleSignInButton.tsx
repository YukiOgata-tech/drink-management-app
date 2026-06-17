import { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, View } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { signInWithGoogle } from '@/lib/auth';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';

interface GoogleSignInButtonProps {
  /** ログイン/登録どちらでも文言を切り替え可能 */
  label?: string;
}

/**
 * Googleでログイン/登録するボタン（共通authのWeb側と同一プロバイダ）。
 * 認証〜ユーザー設定〜画面遷移までを内包し、login/signup 双方から使える。
 */
export function GoogleSignInButton({ label = 'Googleで続ける' }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const setUser = useUserStore((state) => state.setUser);
  const isDark = useThemeStore((state) => state.colorScheme) === 'dark';

  const handlePress = async () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    const { user, error, cancelled } = await signInWithGoogle();
    setLoading(false);

    if (cancelled) return; // ユーザーが閉じただけ
    if (error) {
      Alert.alert('Googleログインエラー', error.message);
      return;
    }
    if (user) {
      setUser(user, false);
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.8}
      className="flex-row items-center justify-center rounded-xl py-3.5"
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderWidth: 1,
        borderColor: isDark ? '#374151' : '#e5e7eb',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isDark ? '#e5e7eb' : '#4b5563'} />
      ) : (
        <View className="flex-row items-center">
          <AntDesign name="google" size={18} color="#EA4335" />
          <Text
            className="font-semibold text-base ml-3"
            style={{ color: isDark ? '#f3f4f6' : '#1f2937' }}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

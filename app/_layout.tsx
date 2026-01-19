import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import '@/global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUserStore } from '@/stores/user';
import { handleAuthCallback } from '@/lib/auth';

export const unstable_settings = {
  initialRouteName: 'consent',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const initializeAuth = useUserStore((state) => state.initializeAuth);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    initializeAuth();
  }, []);

  // ディープリンクハンドラー
  useEffect(() => {
    // アプリ起動時のURLをチェック
    const handleInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        await processAuthUrl(url);
      }
    };

    // URLイベントリスナー（アプリが既に起動している場合）
    const subscription = Linking.addEventListener('url', async (event) => {
      await processAuthUrl(event.url);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, []);

  const processAuthUrl = async (url: string) => {
    // 認証コールバックURLかチェック
    if (url.includes('auth/callback')) {
      const { user, error } = await handleAuthCallback(url);

      if (user && !error) {
        setUser(user, false);
        // 認証成功後、プロフィール画面に遷移
        router.replace('/(tabs)/profile');
      }
      return;
    }

    // イベント招待URLかチェック
    const { path, queryParams } = Linking.parse(url);
    if (path === 'events/join' && queryParams?.code) {
      // 招待コードを持って参加確認画面へ
      router.push(`/join-event?code=${queryParams.code}`);
    }
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Slot />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

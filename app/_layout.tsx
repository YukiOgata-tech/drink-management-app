import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import '@/global.css';

import { useUserStore } from '@/stores/user';
import { handleAuthCallback } from '@/lib/auth';

export const unstable_settings = {
  initialRouteName: 'consent',
};

// カスタムテーマ（ライトモード固定）
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f9fafb',
    card: '#ffffff',
    text: '#111827',
    border: '#e5e7eb',
    primary: '#0ea5e9',
  },
};

export default function RootLayout() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    initializeAuth();
  }, []);

  // ディープリンクハンドラー
  useEffect(() => {
    const handleInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        await processAuthUrl(url);
      }
    };

    const subscription = Linking.addEventListener('url', async (event) => {
      await processAuthUrl(event.url);
    });

    handleInitialUrl();

    return () => {
      subscription.remove();
    };
  }, []);

  const processAuthUrl = async (url: string) => {
    if (url.includes('auth/callback')) {
      const { user, error } = await handleAuthCallback(url);

      if (user && !error) {
        setUser(user, false);
        router.replace('/(tabs)/profile');
      }
      return;
    }

    const { path, queryParams } = Linking.parse(url);
    if (path === 'events/join' && queryParams?.code) {
      router.push(`/join-event?code=${queryParams.code}`);
    }
  };

  return (
    <ThemeProvider value={AppTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="consent" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="join-event" />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

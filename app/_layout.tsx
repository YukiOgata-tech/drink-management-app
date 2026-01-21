import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import '@/global.css';

import { useUserStore } from '@/stores/user';
import { useSyncStore } from '@/stores/sync';
import { handleAuthCallback } from '@/lib/auth';
import {
  isFirstPermissionRequest,
  requestNotificationPermission,
  getExpoPushToken,
  addNotificationResponseListener,
} from '@/lib/notifications';
import { NotificationPermissionModal } from '@/components/NotificationPermissionModal';

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
  const user = useUserStore((state) => state.user);
  const initializeSync = useSyncStore((state) => state.initialize);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  // 同期サービスの初期化
  useEffect(() => {
    const cleanup = initializeSync();
    return cleanup;
  }, []);

  // 初回起動時の通知許可チェック
  useEffect(() => {
    const checkNotificationPermission = async () => {
      // ユーザーがログインしている場合のみ通知許可を求める
      if (user) {
        const isFirst = await isFirstPermissionRequest();
        if (isFirst) {
          // 少し遅延させてからモーダルを表示
          setTimeout(() => {
            setShowNotificationModal(true);
          }, 1500);
        }
      }
    };

    checkNotificationPermission();
  }, [user]);

  // 通知タップ時のハンドラー
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      // 通知データに応じて画面遷移
      if (data?.eventId) {
        router.push(`/(tabs)/events/${data.eventId}`);
      } else if (data?.screen) {
        router.push(data.screen as string);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleAllowNotification = async () => {
    setShowNotificationModal(false);
    const granted = await requestNotificationPermission();
    if (granted) {
      // Push Tokenを取得（将来的にサーバーに保存）
      await getExpoPushToken();
    }
  };

  const handleSkipNotification = async () => {
    setShowNotificationModal(false);
    // スキップしても権限リクエスト済みフラグは立てる
    await requestNotificationPermission();
  };

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
        <NotificationPermissionModal
          visible={showNotificationModal}
          onAllow={handleAllowNotification}
          onSkip={handleSkipNotification}
        />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

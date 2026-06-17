import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** EAS projectId を解決（env → app.json の extra.eas.projectId の順） */
function resolveProjectId(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_PROJECT_ID ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    (Constants as any)?.easConfig?.projectId
  );
}

const NOTIFICATION_PERMISSION_KEY = 'notification_permission_requested';
const PUSH_TOKEN_KEY = 'push_token';

// 通知の表示設定
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * 「通知許可を尋ねた」フラグを保存（モーダルの再表示防止）。
 * 実機/シミュレータや許可の可否に関わらず必ず保存する。
 */
export async function markPermissionRequested(): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
}

/**
 * プッシュ通知の権限をリクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // 「尋ねた」フラグは端末種別・早期returnに関わらず先に保存する
  // （シミュレータでフラグが立たずモーダルが再表示される問題を防止）
  await markPermissionRequested();

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * 権限リクエストが初めてかどうか
 */
export async function isFirstPermissionRequest(): Promise<boolean> {
  const requested = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
  return requested !== 'true';
}

/**
 * 現在の権限ステータスを取得
 */
export async function getNotificationPermissionStatus(): Promise<string> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Expo Push Tokenを取得
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  try {
    // Android用のチャンネル設定
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0ea5e9',
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const projectId = resolveProjectId();
    if (!projectId) {
      console.warn('Push token skipped: EAS projectId が見つかりません');
      return null;
    }
    const token = await Notifications.getExpoPushTokenAsync({ projectId });

    // トークンをローカルに保存
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);

    return token.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * 保存されたPush Tokenを取得
 */
export async function getSavedPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/**
 * ローカル通知をスケジュール
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  trigger?: Notifications.NotificationTriggerInput
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: trigger || null, // nullで即時通知
  });
}

/**
 * 通知リスナーを設定
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * 通知タップリスナーを設定
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * バッジをクリア
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * すべての通知をキャンセル
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

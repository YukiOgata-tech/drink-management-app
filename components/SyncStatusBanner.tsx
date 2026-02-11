import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSyncStore, SyncStatus } from '@/stores/sync';
import { retryFailedLogs } from '@/lib/storage/eventDrinkLogs';

interface SyncStatusBannerProps {
  compact?: boolean;
}

type StatusConfig = {
  bgColor: string;
  textColor: string;
  icon: keyof typeof Feather.glyphMap;
  message: string;
};

export function SyncStatusBanner({ compact = false }: SyncStatusBannerProps) {
  const status = useSyncStore((state) => state.status);
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingPersonalLogs = useSyncStore((state) => state.pendingPersonalLogs);
  const pendingEventLogs = useSyncStore((state) => state.pendingEventLogs);
  const failedEventLogs = useSyncStore((state) => state.failedEventLogs);
  const sync = useSyncStore((state) => state.sync);
  const refreshPendingCounts = useSyncStore((state) => state.refreshPendingCounts);

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  // 失敗ログのリトライ処理
  const handleRetryFailed = async () => {
    Alert.alert(
      '失敗した記録を再試行',
      `${failedEventLogs}件の記録を再度同期しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '再試行',
          onPress: async () => {
            const count = await retryFailedLogs();
            await refreshPendingCounts();
            if (count > 0 && isOnline) {
              sync();
            }
          },
        },
      ]
    );
  };

  // 表示するかどうかの判定
  const shouldShow = !isOnline || status === 'syncing' || totalPending > 0 || failedEventLogs > 0;

  if (!shouldShow) return null;

  const getStatusConfig = (): StatusConfig => {
    if (!isOnline) {
      return {
        bgColor: 'bg-gray-700',
        textColor: 'text-white',
        icon: 'wifi-off',
        message: 'オフライン',
      };
    }

    // 失敗ログがある場合は優先的に表示
    if (failedEventLogs > 0 && status !== 'syncing') {
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        icon: 'alert-circle',
        message: `${failedEventLogs}件の同期に失敗`,
      };
    }

    switch (status) {
      case 'syncing':
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: 'refresh-cw',
          message: '同期中...',
        };
      case 'success':
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          icon: 'check-circle',
          message: '同期完了',
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: 'alert-triangle',
          message: '同期エラー',
        };
      default:
        if (totalPending > 0) {
          return {
            bgColor: 'bg-amber-500',
            textColor: 'text-white',
            icon: 'clock',
            message: `${totalPending}件の同期待ち`,
          };
        }
        return {
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          icon: 'circle',
          message: '',
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <Animated.View
        entering={FadeInDown.duration(300)}
        exiting={FadeOutUp.duration(300)}
      >
        <TouchableOpacity
          onPress={() => isOnline && totalPending > 0 && sync()}
          disabled={status === 'syncing' || !isOnline}
          className={`flex-row items-center px-3 py-1.5 rounded-full ${config.bgColor}`}
        >
          {status === 'syncing' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name={config.icon} size={14} color="#ffffff" style={{ marginRight: 4 }} />
          )}
          <Text className={`text-sm font-medium ${config.textColor}`}>
            {config.message}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
      className={`px-4 py-3 ${config.bgColor}`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          {status === 'syncing' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Feather name={config.icon} size={20} color="#ffffff" style={{ marginRight: 8 }} />
          )}
          <View className="flex-1">
            <Text className={`font-semibold ${config.textColor}`}>
              {config.message}
            </Text>
            {!isOnline && totalPending > 0 && (
              <Text className="text-white/80 text-sm">
                オンライン復帰時に{totalPending}件を同期します
              </Text>
            )}
            {failedEventLogs > 0 && isOnline && status !== 'syncing' && (
              <Text className="text-white/80 text-sm">
                タップして再試行できます
              </Text>
            )}
          </View>
        </View>

        {/* 失敗ログがある場合は再試行ボタン */}
        {isOnline && failedEventLogs > 0 && status !== 'syncing' && (
          <TouchableOpacity
            onPress={handleRetryFailed}
            className="bg-white/20 px-4 py-2 rounded-lg"
          >
            <Text className={`font-semibold ${config.textColor}`}>
              再試行
            </Text>
          </TouchableOpacity>
        )}

        {/* 通常の同期待ちの場合 */}
        {isOnline && totalPending > 0 && failedEventLogs === 0 && status !== 'syncing' && (
          <TouchableOpacity
            onPress={sync}
            className="bg-white/20 px-4 py-2 rounded-lg"
          >
            <Text className={`font-semibold ${config.textColor}`}>
              今すぐ同期
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * 小さなドットインジケーター
 */
export function SyncStatusDot() {
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingPersonalLogs = useSyncStore((state) => state.pendingPersonalLogs);
  const pendingEventLogs = useSyncStore((state) => state.pendingEventLogs);
  const failedEventLogs = useSyncStore((state) => state.failedEventLogs);
  const status = useSyncStore((state) => state.status);

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  if (isOnline && totalPending === 0 && failedEventLogs === 0 && status !== 'syncing') return null;

  let bgColor = 'bg-green-500';
  if (!isOnline) bgColor = 'bg-gray-500';
  else if (failedEventLogs > 0) bgColor = 'bg-red-500';
  else if (status === 'syncing') bgColor = 'bg-blue-500';
  else if (totalPending > 0) bgColor = 'bg-amber-500';

  return (
    <View className={`w-2 h-2 rounded-full ${bgColor}`} />
  );
}

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSyncStore, SyncStatus } from '@/stores/sync';

interface SyncStatusBannerProps {
  compact?: boolean;
}

export function SyncStatusBanner({ compact = false }: SyncStatusBannerProps) {
  const status = useSyncStore((state) => state.status);
  const isOnline = useSyncStore((state) => state.isOnline);
  const pendingPersonalLogs = useSyncStore((state) => state.pendingPersonalLogs);
  const pendingEventLogs = useSyncStore((state) => state.pendingEventLogs);
  const sync = useSyncStore((state) => state.sync);

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  // 表示するかどうかの判定
  const shouldShow = !isOnline || status === 'syncing' || totalPending > 0;

  if (!shouldShow) return null;

  const getStatusConfig = (): {
    bgColor: string;
    textColor: string;
    icon: string;
    message: string;
  } => {
    if (!isOnline) {
      return {
        bgColor: 'bg-gray-700',
        textColor: 'text-white',
        icon: '📡',
        message: 'オフライン',
      };
    }

    switch (status) {
      case 'syncing':
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: '🔄',
          message: '同期中...',
        };
      case 'success':
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          icon: '✓',
          message: '同期完了',
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: '⚠️',
          message: '同期エラー',
        };
      default:
        if (totalPending > 0) {
          return {
            bgColor: 'bg-amber-500',
            textColor: 'text-white',
            icon: '⏳',
            message: `${totalPending}件の同期待ち`,
          };
        }
        return {
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          icon: '●',
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
            <Text className="text-sm mr-1">{config.icon}</Text>
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
            <Text className="text-lg mr-2">{config.icon}</Text>
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
          </View>
        </View>

        {isOnline && totalPending > 0 && status !== 'syncing' && (
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
  const status = useSyncStore((state) => state.status);

  const totalPending = pendingPersonalLogs + pendingEventLogs;

  if (isOnline && totalPending === 0 && status !== 'syncing') return null;

  let bgColor = 'bg-green-500';
  if (!isOnline) bgColor = 'bg-gray-500';
  else if (status === 'syncing') bgColor = 'bg-blue-500';
  else if (totalPending > 0) bgColor = 'bg-amber-500';

  return (
    <View className={`w-2 h-2 rounded-full ${bgColor}`} />
  );
}

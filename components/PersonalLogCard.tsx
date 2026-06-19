import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { useThemeStore } from '@/stores/theme';
import { PersonalDrinkLog } from '@/types';
import { XP_VALUES } from '@/lib/xp';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

const getCategoryEmoji = (category: string) => {
  const emojiMap: Record<string, string> = {
    beer: '🍺',
    highball: '🥃',
    chuhai_sour: '🍋',
    shochu: '🥃',
    sake: '🍶',
    wine: '🍷',
    cocktail: '🍹',
    other: '🍸',
  };
  return emojiMap[category] || '🍺';
};

interface PersonalLogCardProps {
  log: PersonalDrinkLog;
  /** その日の最初の記録（デイリーボーナス）判定に使う全ログ */
  allLogs: PersonalDrinkLog[];
  onLongPress?: (log: PersonalDrinkLog) => void;
}

/**
 * 個人飲酒記録カード（記録タブ・全記録一覧で共通利用）。
 */
export function PersonalLogCard({ log, allLogs, onLongPress }: PersonalLogCardProps) {
  const isDark = useThemeStore((s) => s.colorScheme) === 'dark';

  // この記録がその日の最初の記録かどうかを判定
  const logDate = dayjs(log.recordedAt).format('YYYY-MM-DD');
  const isFirstOfDay = !allLogs.some(
    (otherLog) =>
      otherLog.id !== log.id &&
      !otherLog.deletedAt &&
      dayjs(otherLog.recordedAt).format('YYYY-MM-DD') === logDate &&
      dayjs(otherLog.recordedAt).isBefore(dayjs(log.recordedAt))
  );

  // XP計算（同期済みの記録のみXPが付与されている、純アルコール量分）
  const earnedXP =
    log.syncStatus === 'synced' || log.supabaseId
      ? Math.floor(log.pureAlcoholG * log.count) + (isFirstOfDay ? XP_VALUES.DAILY_BONUS : 0)
      : 0;

  const isDeleted = !!log.deletedAt;

  return (
    <TouchableOpacity
      onLongPress={() => !isDeleted && onLongPress?.(log)}
      delayLongPress={500}
      activeOpacity={isDeleted || !onLongPress ? 1 : 0.7}
      disabled={isDeleted || !onLongPress}
    >
      <Card variant="outlined" className={isDeleted ? 'opacity-50' : ''}>
        <View className="flex-row items-center">
          <Text className={`text-3xl mr-3 ${isDeleted ? 'opacity-50' : ''}`}>
            {getCategoryEmoji(log.drinkCategory)}
          </Text>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text
                className={`text-base font-semibold ${
                  isDeleted
                    ? 'text-gray-400 line-through'
                    : isDark
                      ? 'text-white'
                      : 'text-gray-900'
                }`}
              >
                {log.drinkName}
              </Text>
              {isDeleted && (
                <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                  <Text className="text-xs text-red-600 font-semibold">削除済み</Text>
                </View>
              )}
              {!isDeleted && log.isCustomDrink && (
                <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                  <Text className="text-xs text-amber-700 font-semibold">カスタム</Text>
                </View>
              )}
            </View>
            <Text
              className={`text-sm mt-1 ${
                isDeleted ? 'text-gray-300' : isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {log.count}杯 • {log.pureAlcoholG.toFixed(1)}g
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isDeleted ? 'text-gray-300' : isDark ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {dayjs(log.recordedAt).format('M月D日 HH:mm')}
            </Text>
            {!isDeleted && log.memo && (
              <View className="flex-row items-center mt-1">
                <Feather name="message-circle" size={10} color="#4b5563" style={{ marginRight: 4 }} />
                <Text className="text-xs text-gray-600">{log.memo}</Text>
              </View>
            )}
          </View>
          {!isDeleted && (
            <View className="items-end">
              {earnedXP > 0 && (
                <View className="bg-green-100 px-2 py-1 rounded-lg mb-1">
                  <Text className="text-xs font-semibold text-green-600">+{earnedXP} XP</Text>
                </View>
              )}
              <View className="bg-blue-100 px-2 py-1 rounded-lg">
                <Text className="text-xs font-semibold text-blue-600">個人</Text>
              </View>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
}

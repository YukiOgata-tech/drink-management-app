import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Event } from '@/types';
import { Card } from '@/components/ui';
import { useThemeStore } from '@/stores/theme';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface EventCardProps {
  event: Event;
  isHost?: boolean;
  onPress?: () => void;
}

const recordingRuleIcon: Record<string, keyof typeof Feather.glyphMap> = {
  self: 'edit-3',
  host_only: 'shield',
  consensus: 'users',
};

const recordingRuleName = {
  self: '各自入力',
  host_only: 'ホスト管理',
  consensus: '同意制',
};

export function EventCard({ event, isHost = false, onPress }: EventCardProps) {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card variant="elevated">
        <View className="flex-row items-start">
          <View className={`rounded-full w-14 h-14 items-center justify-center mr-4 ${isDark ? 'bg-secondary-900/30' : 'bg-secondary-100'}`}>
            <Feather name="calendar" size={28} color="#f97316" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className={`text-lg font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {event.title}
              </Text>
              <View
                className={`px-3 py-1 rounded-full ml-2 ${
                  event.endedAt
                    ? (isDark ? 'bg-gray-700' : 'bg-gray-100')
                    : (isDark ? 'bg-green-900/30' : 'bg-green-100')
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    event.endedAt
                      ? (isDark ? 'text-gray-400' : 'text-gray-600')
                      : 'text-green-600'
                  }`}
                >
                  {event.endedAt ? '終了' : '開催中'}
                </Text>
              </View>
            </View>
            {event.description && (
              <Text className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} numberOfLines={2}>
                {event.description}
              </Text>
            )}
            <View className="flex-row items-center gap-4 mb-2">
              <View className="flex-row items-center">
                <Feather name="clock" size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Feather name={recordingRuleIcon[event.recordingRule]} size={12} color={isDark ? '#9ca3af' : '#6b7280'} />
                <Text className={`text-xs ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {recordingRuleName[event.recordingRule]}
                </Text>
              </View>
            </View>
            {isHost && (
              <View className={`border rounded-lg px-2 py-1 self-start ${isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                <Text className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  あなたがホスト
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

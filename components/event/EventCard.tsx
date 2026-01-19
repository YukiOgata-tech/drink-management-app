import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Event } from '@/types';
import { Card } from '@/components/ui';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface EventCardProps {
  event: Event;
  isHost?: boolean;
  onPress?: () => void;
}

export function EventCard({ event, isHost = false, onPress }: EventCardProps) {
  const recordingRuleEmoji = {
    self: '✍️',
    host_only: '👑',
    consensus: '🤝',
  };

  const recordingRuleName = {
    self: '各自入力',
    host_only: 'ホスト管理',
    consensus: '同意制',
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card variant="elevated">
        <View className="flex-row items-start">
          <View className="bg-secondary-100 rounded-full w-14 h-14 items-center justify-center mr-4">
            <Text className="text-3xl">🎉</Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-lg font-bold text-gray-900 flex-1">
                {event.title}
              </Text>
              <View
                className={`px-3 py-1 rounded-full ml-2 ${
                  event.endedAt ? 'bg-gray-100' : 'bg-green-100'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    event.endedAt ? 'text-gray-600' : 'text-green-600'
                  }`}
                >
                  {event.endedAt ? '終了' : '開催中'}
                </Text>
              </View>
            </View>
            {event.description && (
              <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
                {event.description}
              </Text>
            )}
            <View className="flex-row items-center gap-4 mb-2">
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-500">📅</Text>
                <Text className="text-xs text-gray-500 ml-1">
                  {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-xs text-gray-500">
                  {recordingRuleEmoji[event.recordingRule]}
                </Text>
                <Text className="text-xs text-gray-500 ml-1">
                  {recordingRuleName[event.recordingRule]}
                </Text>
              </View>
            </View>
            {isHost && (
              <View className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 self-start">
                <Text className="text-xs font-semibold text-amber-700">
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

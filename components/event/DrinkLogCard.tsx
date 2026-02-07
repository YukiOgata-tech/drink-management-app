import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DrinkLog } from '@/types';
import { Card } from '@/components/ui';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface DrinkLogCardProps {
  log: DrinkLog;
  userName?: string;
  drinkEmoji?: string;
  showStatus?: boolean;
  onPress?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}

const statusConfig = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    label: '承認待ち',
    icon: 'clock' as const,
    iconColor: '#b45309',
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    label: '承認済み',
    icon: 'check-circle' as const,
    iconColor: '#15803d',
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    label: '却下',
    icon: 'x-circle' as const,
    iconColor: '#b91c1c',
  },
};

export function DrinkLogCard({
  log,
  userName,
  drinkEmoji = '🍺',
  showStatus = false,
  onPress,
  onApprove,
  onReject,
}: DrinkLogCardProps) {
  const status = statusConfig[log.status];

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card variant="outlined">
        <View className="flex-row items-center">
          <Text className="text-3xl mr-3">{drinkEmoji}</Text>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-base font-semibold text-gray-900">
                {log.drinkName}
              </Text>
              {showStatus && (
                <View className={`flex-row items-center px-2 py-1 rounded-full ${status.bg}`}>
                  <Feather name={status.icon} size={12} color={status.iconColor} />
                  <Text className={`text-xs font-semibold ${status.text} ml-1`}>
                    {status.label}
                  </Text>
                </View>
              )}
            </View>
            {userName && (
              <Text className="text-sm text-gray-600 mb-1">{userName}</Text>
            )}
            <Text className="text-sm text-gray-500">
              {log.count}杯 • {(log.pureAlcoholG * log.count).toFixed(1)}g
            </Text>
            {log.memo && (
              <View className="flex-row items-center mt-1">
                <Feather name="message-circle" size={10} color="#6b7280" />
                <Text className="text-xs text-gray-500 ml-1" numberOfLines={1}>
                  {log.memo}
                </Text>
              </View>
            )}
            <Text className="text-xs text-gray-400 mt-1">
              {dayjs(log.recordedAt).format('M月D日 HH:mm')}
            </Text>
          </View>
        </View>
        {(onApprove || onReject) && log.status === 'pending' && (
          <View className="flex-row gap-2 mt-3">
            {onReject && (
              <TouchableOpacity
                onPress={onReject}
                className="flex-1 bg-gray-100 py-2 rounded-lg items-center"
              >
                <Text className="text-gray-700 font-semibold">却下</Text>
              </TouchableOpacity>
            )}
            {onApprove && (
              <TouchableOpacity
                onPress={onApprove}
                className="flex-1 bg-primary-500 py-2 rounded-lg items-center"
              >
                <Text className="text-white font-semibold">承認する</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

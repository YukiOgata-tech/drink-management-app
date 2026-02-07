import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DrinkLog } from '@/types';
import { Card } from '@/components/ui';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface ApprovalCardProps {
  log: DrinkLog;
  userName: string;
  drinkEmoji?: string;
  currentApprovals: number;
  requiredApprovals: number;
  canApprove: boolean;
  onApprove?: () => void;
}

export function ApprovalCard({
  log,
  userName,
  drinkEmoji = '🍺',
  currentApprovals,
  requiredApprovals,
  canApprove,
  onApprove,
}: ApprovalCardProps) {
  return (
    <Card variant="outlined" className="border-yellow-300 bg-yellow-50">
      <View className="flex-row items-start mb-3">
        <Text className="text-3xl mr-3">{drinkEmoji}</Text>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {log.drinkName}
          </Text>
          <Text className="text-sm text-gray-600 mb-1">{userName}</Text>
          <Text className="text-sm text-gray-500">
            {log.count}杯 • {(log.pureAlcoholG * log.count).toFixed(1)}g
          </Text>
          {log.memo && (
            <View className="flex-row items-center mt-1">
              <Feather name="message-circle" size={10} color="#6b7280" />
              <Text className="text-xs text-gray-500 ml-1" numberOfLines={2}>
                {log.memo}
              </Text>
            </View>
          )}
          <Text className="text-xs text-gray-400 mt-1">
            {dayjs(log.recordedAt).format('M月D日 HH:mm')}
          </Text>
        </View>
      </View>

      {/* 承認状況 */}
      <View className="bg-white border border-yellow-300 rounded-lg p-3 mb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-semibold text-gray-900">承認状況</Text>
          <Text className="text-sm font-bold text-yellow-700">
            {currentApprovals} / {requiredApprovals}
          </Text>
        </View>
        <View className="flex-row items-center">
          <View className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
            <View
              className="bg-yellow-500 h-2 rounded-full"
              style={{
                width: `${Math.min(
                  (currentApprovals / requiredApprovals) * 100,
                  100
                )}%`,
              }}
            />
          </View>
          <Text className="text-xs text-gray-500">
            あと{Math.max(requiredApprovals - currentApprovals, 0)}人
          </Text>
        </View>
      </View>

      {/* 承認ボタン */}
      {canApprove && onApprove ? (
        <TouchableOpacity
          onPress={onApprove}
          className="bg-primary-500 py-3 rounded-lg items-center"
        >
          <Text className="text-white font-semibold">承認する</Text>
        </TouchableOpacity>
      ) : !canApprove ? (
        <View className="bg-gray-100 py-3 rounded-lg items-center">
          <Text className="text-gray-500 font-semibold">
            {log.userId === log.recordedById
              ? '自分の記録は承認できません'
              : '承認済みです'}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

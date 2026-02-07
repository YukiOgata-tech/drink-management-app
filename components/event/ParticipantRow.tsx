import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { EventMember } from '@/types';

interface ParticipantRowProps {
  member: EventMember;
  userName: string;
  userAvatar?: string;
  totalDrinks?: number;
  totalAlcohol?: number;
  onPress?: () => void;
}

const roleConfig = {
  host: { label: 'ホスト', icon: 'star' as const, iconColor: '#b45309', bg: 'bg-amber-100', text: 'text-amber-700' },
  manager: { label: '管理者', icon: 'shield' as const, iconColor: '#1d4ed8', bg: 'bg-blue-100', text: 'text-blue-700' },
  member: { label: 'メンバー', icon: 'user' as const, iconColor: '#374151', bg: 'bg-gray-100', text: 'text-gray-700' },
};

export function ParticipantRow({
  member,
  userName,
  userAvatar,
  totalDrinks = 0,
  totalAlcohol = 0,
  onPress,
}: ParticipantRowProps) {
  const role = roleConfig[member.role];
  const isActive = !member.leftAt;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center py-3 ${!isActive ? 'opacity-50' : ''}`}
    >
      {userAvatar ? (
        <Image
          source={{ uri: userAvatar }}
          className="w-12 h-12 rounded-full border-2 border-gray-200 mr-3"
        />
      ) : (
        <View className="w-12 h-12 rounded-full border-2 border-gray-200 mr-3 bg-primary-100 items-center justify-center">
          <Feather name="user" size={24} color="#0ea5e9" />
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-base font-semibold text-gray-900">
            {userName}
          </Text>
          <View className={`flex-row items-center px-2 py-0.5 rounded-full ${role.bg}`}>
            <Feather name={role.icon} size={10} color={role.iconColor} />
            <Text className={`text-xs font-semibold ${role.text} ml-1`}>
              {role.label}
            </Text>
          </View>
          {!isActive && (
            <View className="px-2 py-0.5 rounded-full bg-red-100">
              <Text className="text-xs font-semibold text-red-700">退出済み</Text>
            </View>
          )}
        </View>
        {isActive && (totalDrinks > 0 || totalAlcohol > 0) && (
          <Text className="text-sm text-gray-500">
            {totalDrinks}杯 • {totalAlcohol.toFixed(1)}g
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

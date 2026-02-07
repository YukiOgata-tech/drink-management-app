import React from 'react';
import { View, Text, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui';

interface RankingItem {
  userId: string;
  userName: string;
  userAvatar: string;
  value: number;
  rank: number;
}

interface RankingCardProps {
  item: RankingItem;
  type: 'total' | 'alcohol' | 'pace';
  isCurrentUser?: boolean;
}

const rankConfig = [
  { color: '#eab308', bgColor: '#fef9c3', iconColor: '#ca8a04' }, // 1st - gold
  { color: '#6b7280', bgColor: '#f3f4f6', iconColor: '#4b5563' }, // 2nd - silver
  { color: '#d97706', bgColor: '#fef3c7', iconColor: '#b45309' }, // 3rd - bronze
];

export function RankingCard({ item, type, isCurrentUser = false }: RankingCardProps) {
  const valueLabel = {
    total: '杯',
    alcohol: 'g',
    pace: '杯/時間',
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-600';
    if (rank === 2) return 'text-gray-500';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-700';
  };

  const getRankDisplay = (rank: number) => {
    if (rank <= 3) {
      return (
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: rankConfig[rank - 1].bgColor }}
        >
          <Feather name="award" size={18} color={rankConfig[rank - 1].iconColor} />
        </View>
      );
    }
    return (
      <View className="w-8 h-8 rounded-full items-center justify-center mr-3 bg-gray-100">
        <Text className="text-sm font-bold text-gray-600">{rank}</Text>
      </View>
    );
  };

  return (
    <Card
      variant={isCurrentUser ? 'elevated' : 'outlined'}
      className={isCurrentUser ? 'border-2 border-primary-500 bg-primary-50' : ''}
    >
      <View className="flex-row items-center">
        {getRankDisplay(item.rank)}
        {item.userAvatar ? (
          <Image
            source={{ uri: item.userAvatar }}
            className="w-12 h-12 rounded-full border-2 border-gray-200 mr-3"
          />
        ) : (
          <View className="w-12 h-12 rounded-full border-2 border-gray-200 mr-3 bg-primary-100 items-center justify-center">
            <Feather name="user" size={24} color="#0ea5e9" />
          </View>
        )}
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {item.userName}
            {isCurrentUser && (
              <Text className="text-primary-600"> (あなた)</Text>
            )}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {type === 'pace'
              ? item.value.toFixed(2)
              : type === 'alcohol'
              ? item.value.toFixed(1)
              : item.value}
            {valueLabel[type]}
          </Text>
        </View>
        {item.rank <= 3 && (
          <View
            className="w-14 h-14 rounded-full items-center justify-center"
            style={{ backgroundColor: rankConfig[item.rank - 1].bgColor }}
          >
            <Feather name="award" size={28} color={rankConfig[item.rank - 1].iconColor} />
          </View>
        )}
      </View>
    </Card>
  );
}

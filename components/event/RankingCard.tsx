import React from 'react';
import { View, Text, Image } from 'react-native';
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

export function RankingCard({ item, type, isCurrentUser = false }: RankingCardProps) {
  const rankEmojis = ['🥇', '🥈', '🥉'];
  const rankEmoji = item.rank <= 3 ? rankEmojis[item.rank - 1] : `${item.rank}位`;

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

  return (
    <Card
      variant={isCurrentUser ? 'elevated' : 'outlined'}
      className={isCurrentUser ? 'border-2 border-primary-500 bg-primary-50' : ''}
    >
      <View className="flex-row items-center">
        <Text className={`text-2xl font-bold mr-3 ${getRankColor(item.rank)}`}>
          {rankEmoji}
        </Text>
        <Image
          source={{ uri: item.userAvatar }}
          className="w-12 h-12 rounded-full border-2 border-gray-200 mr-3"
        />
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
          <View className="w-16 h-16 items-center justify-center">
            <Text className="text-4xl">{rankEmoji}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

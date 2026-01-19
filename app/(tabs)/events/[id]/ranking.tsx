import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui';
import { RankingCard } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import { DrinkLog } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type RankingType = 'total' | 'alcohol';

interface RankingItem {
  userId: string;
  userName: string;
  userAvatar: string;
  value: number;
  rank: number;
}

export default function RankingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const event = useEventsStore((state) => state.getEventById(id));
  const members = useEventsStore((state) => state.getEventMembers(id));

  const [drinkLogs, setDrinkLogs] = useState<DrinkLog[]>([]);
  const [rankingType, setRankingType] = useState<RankingType>('total');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    await loadDrinkLogs();
    setLoading(false);
  };

  const loadDrinkLogs = async () => {
    const { drinkLogs: logs, error } =
      await DrinkLogsAPI.getDrinkLogsByEvent(id);
    if (!error && logs) {
      // 承認済みの記録のみ
      const approvedLogs = logs.filter((log) => log.status === 'approved');
      setDrinkLogs(approvedLogs);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const calculateRankings = (type: RankingType): RankingItem[] => {
    const memberStats = new Map<string, number>();

    // 各メンバーの統計を集計
    members.forEach((member) => {
      memberStats.set(member.userId, 0);
    });

    drinkLogs.forEach((log) => {
      const current = memberStats.get(log.userId) || 0;

      if (type === 'total') {
        memberStats.set(log.userId, current + log.count);
      } else if (type === 'alcohol') {
        memberStats.set(log.userId, current + log.pureAlcoholG * log.count);
      }
    });

    // ランキングに変換
    const rankings = Array.from(memberStats.entries())
      .map(([userId, value]) => ({
        userId,
        userName: `ユーザー`,
        userAvatar: 'https://via.placeholder.com/150',
        value,
        rank: 0,
      }))
      .sort((a, b) => b.value - a.value);

    // 順位を設定
    rankings.forEach((item, index) => {
      item.rank = index + 1;
    });

    return rankings;
  };

  if (!user || !event) {
    router.back();
    return null;
  }

  const rankings = calculateRankings(rankingType);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <TouchableOpacity onPress={() => router.back()} className="mb-2">
            <Text className="text-primary-600 font-semibold text-base">
              ← 戻る
            </Text>
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-gray-900">ランキング 🏆</Text>
        </View>

        <ScrollView
          className="flex-1 px-6 py-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ランキング種類選択 */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(600)}
            className="mb-6"
          >
            <Card variant="elevated">
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setRankingType('total');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`flex-1 py-3 rounded-xl ${
                    rankingType === 'total'
                      ? 'bg-primary-500'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      rankingType === 'total' ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    🍺 総杯数
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setRankingType('alcohol');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`flex-1 py-3 rounded-xl ${
                    rankingType === 'alcohol'
                      ? 'bg-primary-500'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      rankingType === 'alcohol'
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    ⚗️ 純アルコール
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </Animated.View>

          {/* ランキング */}
          {rankings.length > 0 ? (
            <View className="space-y-3">
              {rankings.map((item, index) => (
                <Animated.View
                  key={item.userId}
                  entering={FadeInDown.delay(150 + index * 30).duration(600)}
                >
                  <RankingCard
                    item={item}
                    type={rankingType}
                    isCurrentUser={item.userId === user.id}
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <Animated.View entering={FadeInDown.delay(150).duration(600)}>
              <Card variant="outlined">
                <View className="items-center py-12">
                  <Text className="text-4xl mb-2">📊</Text>
                  <Text className="text-gray-500">まだ記録がありません</Text>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 統計情報 */}
          {drinkLogs.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(300).duration(600)}
              className="mt-6"
            >
              <Card variant="elevated">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  イベント統計
                </Text>
                <View className="space-y-3">
                  <StatRow
                    icon="🍺"
                    label="総記録数"
                    value={`${drinkLogs.length}件`}
                  />
                  <StatRow
                    icon="👥"
                    label="参加者数"
                    value={`${members.length}人`}
                  />
                  <StatRow
                    icon="📊"
                    label="総杯数"
                    value={`${drinkLogs.reduce(
                      (sum, log) => sum + log.count,
                      0
                    )}杯`}
                  />
                  <StatRow
                    icon="⚗️"
                    label="総純アルコール量"
                    value={`${drinkLogs
                      .reduce((sum, log) => sum + log.pureAlcoholG * log.count, 0)
                      .toFixed(1)}g`}
                  />
                </View>
              </Card>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <Text className="text-xl mr-3">{icon}</Text>
        <Text className="text-sm text-gray-600">{label}</Text>
      </View>
      <Text className="text-base font-bold text-gray-900">{value}</Text>
    </View>
  );
}

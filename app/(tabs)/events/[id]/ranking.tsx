import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import { DrinkLogWithUser, EventMember } from '@/types';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

type RankingCategory = 'drinks' | 'alcohol' | 'variety' | 'frequency';

interface RankingItem {
  userId: string;
  userName: string;
  userAvatar?: string;
  value: number;
  rank: number;
  subValue?: string;
}

const CATEGORIES: { id: RankingCategory; label: string; emoji: string; unit: string; description: string }[] = [
  { id: 'drinks', label: '総杯数', emoji: '🍺', unit: '杯', description: '一番飲んだのは誰？' },
  { id: 'alcohol', label: 'アルコール量', emoji: '⚗️', unit: 'g', description: '純アルコール量で勝負' },
  { id: 'variety', label: '種類数', emoji: '🎨', unit: '種類', description: 'いろんなお酒を試した人' },
  { id: 'frequency', label: '記録回数', emoji: '📝', unit: '回', description: 'こまめに記録した人' },
];

export default function RankingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const event = useEventsStore((state) => state.getEventById(id));
  const members = useEventsStore((state) => state.getEventMembers(id));
  const fetchEventMembers = useEventsStore((state) => state.fetchEventMembers);

  const [drinkLogs, setDrinkLogs] = useState<DrinkLogWithUser[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<RankingCategory>('drinks');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEventMembers(id),
      loadDrinkLogs(),
    ]);
    setLoading(false);
  };

  const loadDrinkLogs = async () => {
    const { drinkLogs: logs, error } = await DrinkLogsAPI.getDrinkLogsByEvent(id);
    if (!error && logs) {
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

  // メンバー情報のマップを作成
  const memberMap = useMemo(() => {
    const map = new Map<string, EventMember>();
    members.forEach((m) => map.set(m.userId, m));
    return map;
  }, [members]);

  // ランキングを計算
  const rankings = useMemo((): RankingItem[] => {
    const memberStats = new Map<string, { drinks: number; alcohol: number; variety: Set<string>; frequency: number }>();

    // 初期化
    members.forEach((member) => {
      memberStats.set(member.userId, {
        drinks: 0,
        alcohol: 0,
        variety: new Set(),
        frequency: 0,
      });
    });

    // 集計
    drinkLogs.forEach((log) => {
      const stats = memberStats.get(log.userId);
      if (stats) {
        stats.drinks += log.count;
        stats.alcohol += log.pureAlcoholG * log.count;
        stats.variety.add(log.drinkName);
        stats.frequency += 1;
      }
    });

    // ランキング生成
    const items = Array.from(memberStats.entries())
      .map(([userId, stats]) => {
        const member = memberMap.get(userId);
        let value: number;
        let subValue: string | undefined;

        switch (selectedCategory) {
          case 'drinks':
            value = stats.drinks;
            subValue = `${stats.alcohol.toFixed(1)}g`;
            break;
          case 'alcohol':
            value = stats.alcohol;
            subValue = `${stats.drinks}杯`;
            break;
          case 'variety':
            value = stats.variety.size;
            subValue = `${stats.drinks}杯`;
            break;
          case 'frequency':
            value = stats.frequency;
            subValue = `${stats.drinks}杯`;
            break;
        }

        return {
          userId,
          userName: member?.displayName || '名無し',
          userAvatar: member?.avatar,
          value,
          subValue,
          rank: 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    // 順位設定（同率対応）
    let currentRank = 1;
    items.forEach((item, index) => {
      if (index > 0 && item.value < items[index - 1].value) {
        currentRank = index + 1;
      }
      item.rank = currentRank;
    });

    return items;
  }, [drinkLogs, members, memberMap, selectedCategory]);

  // 統計データ
  const stats = useMemo(() => {
    const totalDrinks = drinkLogs.reduce((sum, log) => sum + log.count, 0);
    const totalAlcohol = drinkLogs.reduce((sum, log) => sum + log.pureAlcoholG * log.count, 0);
    const uniqueDrinks = new Set(drinkLogs.map((log) => log.drinkName)).size;
    const avgPerPerson = members.length > 0 ? totalDrinks / members.length : 0;

    return { totalDrinks, totalAlcohol, uniqueDrinks, avgPerPerson };
  }, [drinkLogs, members]);

  if (!user || !event) {
    return null;
  }

  const currentCategory = CATEGORIES.find((c) => c.id === selectedCategory)!;
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.flex}>
        {/* ヘッダー */}
        <LinearGradient
          colors={['#0ea5e9', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ランキング</Text>
          <Text style={styles.headerSubtitle}>{event.title}</Text>
        </LinearGradient>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* カテゴリ選択 */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORIES.map((category, index) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => {
                    setSelectedCategory(category.id);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category.id && styles.categoryTabActive,
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      selectedCategory === category.id && styles.categoryLabelActive,
                    ]}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* カテゴリ説明 */}
          <Animated.View
            entering={FadeIn.delay(150).duration(300)}
            style={styles.categoryDescription}
          >
            <Text style={styles.categoryDescriptionText}>
              {currentCategory.emoji} {currentCategory.description}
            </Text>
          </Animated.View>

          {/* Top 3 表彰台 */}
          {top3.length >= 3 && (
            <Animated.View
              entering={FadeInUp.delay(200).duration(500)}
              style={styles.podiumContainer}
            >
              {/* 2位 */}
              <PodiumItem
                item={top3[1]}
                rank={2}
                height={100}
                gradientColors={['#94a3b8', '#64748b']}
                unit={currentCategory.unit}
                isCurrentUser={top3[1].userId === user.id}
                delay={300}
              />
              {/* 1位 */}
              <PodiumItem
                item={top3[0]}
                rank={1}
                height={130}
                gradientColors={['#fbbf24', '#f59e0b']}
                unit={currentCategory.unit}
                isCurrentUser={top3[0].userId === user.id}
                delay={200}
              />
              {/* 3位 */}
              <PodiumItem
                item={top3[2]}
                rank={3}
                height={80}
                gradientColors={['#d97706', '#b45309']}
                unit={currentCategory.unit}
                isCurrentUser={top3[2].userId === user.id}
                delay={400}
              />
            </Animated.View>
          )}

          {/* Top 3以下の場合 */}
          {top3.length > 0 && top3.length < 3 && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={styles.simpleRankingContainer}
            >
              {top3.map((item, index) => (
                <RankingRow
                  key={item.userId}
                  item={item}
                  unit={currentCategory.unit}
                  isCurrentUser={item.userId === user.id}
                  delay={250 + index * 50}
                />
              ))}
            </Animated.View>
          )}

          {/* 4位以下 */}
          {rest.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(450).duration(400)}
              style={styles.restRankingContainer}
            >
              <Text style={styles.sectionTitle}>その他の参加者</Text>
              {rest.map((item, index) => (
                <RankingRow
                  key={item.userId}
                  item={item}
                  unit={currentCategory.unit}
                  isCurrentUser={item.userId === user.id}
                  delay={500 + index * 30}
                />
              ))}
            </Animated.View>
          )}

          {/* データがない場合 */}
          {rankings.length === 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Card variant="outlined" style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyText}>まだ記録がありません</Text>
                <Text style={styles.emptySubtext}>
                  飲酒記録を追加するとランキングが表示されます
                </Text>
              </Card>
            </Animated.View>
          )}

          {/* イベント統計 */}
          {drinkLogs.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(550).duration(400)}
              style={styles.statsContainer}
            >
              <Text style={styles.sectionTitle}>イベント統計</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  emoji="🍺"
                  value={stats.totalDrinks}
                  unit="杯"
                  label="総杯数"
                  color="#0ea5e9"
                />
                <StatCard
                  emoji="⚗️"
                  value={parseFloat(stats.totalAlcohol.toFixed(1))}
                  unit="g"
                  label="総アルコール"
                  color="#8b5cf6"
                />
                <StatCard
                  emoji="🎨"
                  value={stats.uniqueDrinks}
                  unit="種類"
                  label="ドリンク種類"
                  color="#f59e0b"
                />
                <StatCard
                  emoji="📊"
                  value={parseFloat(stats.avgPerPerson.toFixed(1))}
                  unit="杯"
                  label="平均/人"
                  color="#10b981"
                />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// 表彰台アイテム
function PodiumItem({
  item,
  rank,
  height,
  gradientColors,
  unit,
  isCurrentUser,
  delay,
}: {
  item: RankingItem;
  rank: number;
  height: number;
  gradientColors: string[];
  unit: string;
  isCurrentUser: boolean;
  delay: number;
}) {
  const rankEmojis = ['🥇', '🥈', '🥉'];

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={styles.podiumItem}
    >
      {/* アバター */}
      <View style={[styles.podiumAvatar, isCurrentUser && styles.podiumAvatarCurrent]}>
        {item.userAvatar ? (
          <Animated.Image
            source={{ uri: item.userAvatar }}
            style={styles.podiumAvatarImage}
          />
        ) : (
          <Text style={styles.podiumAvatarEmoji}>👤</Text>
        )}
        <View style={styles.podiumRankBadge}>
          <Text style={styles.podiumRankEmoji}>{rankEmojis[rank - 1]}</Text>
        </View>
      </View>

      {/* 名前 */}
      <Text style={styles.podiumName} numberOfLines={1}>
        {item.userName}
      </Text>

      {/* 値 */}
      <Text style={styles.podiumValue}>
        {unit === 'g' ? item.value.toFixed(1) : item.value}
        <Text style={styles.podiumUnit}>{unit}</Text>
      </Text>

      {/* 台座 */}
      <LinearGradient
        colors={gradientColors as [string, string]}
        style={[styles.podiumBase, { height }]}
      >
        <Text style={styles.podiumRankNumber}>{rank}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

// ランキング行
function RankingRow({
  item,
  unit,
  isCurrentUser,
  delay,
}: {
  item: RankingItem;
  unit: string;
  isCurrentUser: boolean;
  delay: number;
}) {
  return (
    <Animated.View entering={SlideInRight.delay(delay).duration(300)}>
      <View style={[styles.rankingRow, isCurrentUser && styles.rankingRowCurrent]}>
        <Text style={styles.rankingRank}>{item.rank}</Text>
        <View style={styles.rankingAvatar}>
          {item.userAvatar ? (
            <Animated.Image
              source={{ uri: item.userAvatar }}
              style={styles.rankingAvatarImage}
            />
          ) : (
            <Text style={styles.rankingAvatarEmoji}>👤</Text>
          )}
        </View>
        <View style={styles.rankingInfo}>
          <Text style={styles.rankingName}>
            {item.userName}
            {isCurrentUser && <Text style={styles.rankingYou}> (あなた)</Text>}
          </Text>
          {item.subValue && (
            <Text style={styles.rankingSubValue}>{item.subValue}</Text>
          )}
        </View>
        <Text style={styles.rankingValue}>
          {unit === 'g' ? item.value.toFixed(1) : item.value}
          <Text style={styles.rankingUnit}>{unit}</Text>
        </Text>
      </View>
    </Animated.View>
  );
}

// 統計カード
function StatCard({
  emoji,
  value,
  unit,
  label,
  color,
}: {
  emoji: string;
  value: number;
  unit: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statUnit}>{unit}</Text>
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryTabActive: {
    backgroundColor: '#0ea5e9',
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryLabelActive: {
    color: '#fff',
  },
  categoryDescription: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  categoryDescriptionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 120,
  },
  podiumAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  podiumAvatarCurrent: {
    borderColor: '#0ea5e9',
  },
  podiumAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  podiumAvatarEmoji: {
    fontSize: 28,
  },
  podiumRankBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
  },
  podiumRankEmoji: {
    fontSize: 20,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    maxWidth: 80,
    textAlign: 'center',
  },
  podiumValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  podiumUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  podiumBase: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
  },
  simpleRankingContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  restRankingContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rankingRowCurrent: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  rankingRank: {
    width: 28,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
    textAlign: 'center',
  },
  rankingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankingAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  rankingAvatarEmoji: {
    fontSize: 20,
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rankingYou: {
    color: '#0ea5e9',
    fontWeight: 'normal',
  },
  rankingSubValue: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  rankingValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  rankingUnit: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  emptyCard: {
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6b7280',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { DrinkLogCard, ParticipantRow } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import { DrinkLog } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const {
    getEventById,
    getEventMembers,
    fetchEventById,
    fetchEventMembers,
    endEvent,
  } = useEventsStore();

  const [drinkLogs, setDrinkLogs] = useState<DrinkLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const event = getEventById(id);
  const members = getEventMembers(id);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEventById(id),
      fetchEventMembers(id),
      loadDrinkLogs(),
    ]);
    setLoading(false);
  };

  const loadDrinkLogs = async () => {
    const { drinkLogs: logs, error } = await DrinkLogsAPI.getDrinkLogsByEvent(id);
    if (!error && logs) {
      setDrinkLogs(logs);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEndEvent = () => {
    Alert.alert(
      'イベントを終了',
      'イベントを終了しますか？終了後も記録は閲覧できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '終了する',
          style: 'destructive',
          onPress: async () => {
            await endEvent(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onRefresh();
          },
        },
      ]
    );
  };

  if (!user || !event) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500">読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = event.hostId === user.id;
  const isActive = !event.endedAt;
  const currentMember = members.find((m) => m.userId === user.id);
  const canManage =
    currentMember &&
    (currentMember.role === 'host' || currentMember.role === 'manager');

  // 承認待ち件数
  const pendingCount = drinkLogs.filter((log) => log.status === 'pending').length;

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
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                {event.title}
              </Text>
              {event.description && (
                <Text className="text-sm text-gray-500 mt-1">
                  {event.description}
                </Text>
              )}
            </View>
            <View
              className={`px-3 py-1 rounded-full ${
                isActive ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {isActive ? '開催中' : '終了'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6 py-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* クイックアクション */}
          {isActive && (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  アクション
                </Text>
                <View className="space-y-2">
                  <Button
                    title="招待する"
                    icon={<Text className="text-xl">📩</Text>}
                    onPress={() => router.push(`/(tabs)/events/${id}/invite`)}
                    fullWidth
                    variant="outline"
                  />
                  {(event.recordingRule === 'self' || canManage) && (
                    <Button
                      title="飲酒記録を追加"
                      icon={<Text className="text-xl">🍺</Text>}
                      onPress={() =>
                        router.push(`/(tabs)/events/${id}/add-drink`)
                      }
                      fullWidth
                      variant="primary"
                    />
                  )}
                  {event.recordingRule === 'consensus' && pendingCount > 0 && (
                    <Button
                      title={`承認待ち (${pendingCount})`}
                      icon={<Text className="text-xl">⏳</Text>}
                      onPress={() =>
                        router.push(`/(tabs)/events/${id}/approvals`)
                      }
                      fullWidth
                      variant="secondary"
                    />
                  )}
                  <Button
                    title="ランキングを見る"
                    icon={<Text className="text-xl">🏆</Text>}
                    onPress={() => router.push(`/(tabs)/events/${id}/ranking`)}
                    fullWidth
                    variant="outline"
                  />
                  {isHost && isActive && (
                    <Button
                      title="イベントを終了"
                      icon={<Text className="text-xl">🏁</Text>}
                      onPress={handleEndEvent}
                      fullWidth
                      variant="outline"
                    />
                  )}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* イベント情報 */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mb-6"
          >
            <Card variant="elevated">
              <Text className="text-lg font-bold text-gray-900 mb-3">
                イベント情報
              </Text>
              <View className="space-y-3">
                <InfoRow
                  icon="📅"
                  label="開始日時"
                  value={dayjs(event.startedAt).format(
                    'YYYY年M月D日 (ddd) HH:mm'
                  )}
                />
                {event.endedAt && (
                  <InfoRow
                    icon="🏁"
                    label="終了日時"
                    value={dayjs(event.endedAt).format(
                      'YYYY年M月D日 (ddd) HH:mm'
                    )}
                  />
                )}
                <InfoRow
                  icon={
                    event.recordingRule === 'self'
                      ? '✍️'
                      : event.recordingRule === 'host_only'
                      ? '👑'
                      : '🤝'
                  }
                  label="記録ルール"
                  value={
                    event.recordingRule === 'self'
                      ? '各自入力'
                      : event.recordingRule === 'host_only'
                      ? 'ホスト管理'
                      : `同意制 (${event.requiredApprovals}人承認)`
                  }
                />
                <InfoRow
                  icon="🔗"
                  label="招待コード"
                  value={event.inviteCode}
                />
              </View>
            </Card>
          </Animated.View>

          {/* 参加者 */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mb-6"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">
              参加者 ({members.length}人)
            </Text>
            <Card variant="elevated">
              {members.map((member, index) => (
                <ParticipantRow
                  key={`${member.userId}-${member.eventId}`}
                  member={member}
                  userName={`ユーザー${index + 1}`}
                  userAvatar="https://via.placeholder.com/150"
                  totalDrinks={
                    drinkLogs
                      .filter(
                        (log) =>
                          log.userId === member.userId &&
                          log.status === 'approved'
                      )
                      .reduce((sum, log) => sum + log.count, 0)
                  }
                  totalAlcohol={
                    drinkLogs
                      .filter(
                        (log) =>
                          log.userId === member.userId &&
                          log.status === 'approved'
                      )
                      .reduce((sum, log) => sum + log.pureAlcoholG * log.count, 0)
                  }
                />
              ))}
            </Card>
          </Animated.View>

          {/* 最近の記録 */}
          <Animated.View entering={FadeInDown.delay(250).duration(600)}>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              最近の記録
            </Text>
            {drinkLogs.length > 0 ? (
              <View className="space-y-3">
                {drinkLogs.slice(0, 10).map((log, index) => (
                  <Animated.View
                    key={log.id}
                    entering={FadeInDown.delay(300 + index * 20).duration(600)}
                  >
                    <DrinkLogCard
                      log={log}
                      userName={`ユーザー`}
                      showStatus={event.recordingRule === 'consensus'}
                    />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-8">
                  <Text className="text-4xl mb-2">📝</Text>
                  <Text className="text-gray-500">まだ記録がありません</Text>
                </View>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start">
      <Text className="text-xl mr-3">{icon}</Text>
      <View className="flex-1">
        <Text className="text-sm text-gray-500">{label}</Text>
        <Text className="text-base font-semibold text-gray-900 mt-1">
          {value}
        </Text>
      </View>
    </View>
  );
}

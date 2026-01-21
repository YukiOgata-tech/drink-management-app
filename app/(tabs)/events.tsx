import React, { useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { EventCard } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function EventsScreen() {
  const user = useUserStore((state) => state.user);
  const events = useEventsStore((state) => state.events);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const loading = useEventsStore((state) => state.loading);

  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (user) {
      fetchEvents(user.id);
    }
  }, [user]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchEvents(user.id);
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!user) return null;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* オフライン/同期ステータスバナー */}
      <SyncStatusBanner />

      <View className="flex-1">
        {/* ヘッダー */}
        <View className="px-6 py-6 bg-white border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">イベント 🎉</Text>
          <Text className="text-sm text-gray-500 mt-1">
            飲み会イベントを作成・管理
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6 py-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* アクションボタン */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="イベント作成"
                  icon={<Text className="text-xl">➕</Text>}
                  onPress={() => router.push('/(tabs)/events/create')}
                  fullWidth
                  size="lg"
                  variant="secondary"
                />
              </View>
              <View className="flex-1">
                <Button
                  title="QRで参加"
                  icon={<Text className="text-xl">📷</Text>}
                  onPress={() => router.push('/(tabs)/events/scan')}
                  fullWidth
                  size="lg"
                  variant="outline"
                />
              </View>
            </View>
          </Animated.View>

          {/* イベント一覧 */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mt-6"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">
              すべてのイベント
            </Text>
            {events.length > 0 ? (
              <View className="space-y-3">
                {events.map((event, index) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(250 + index * 30).duration(600)}
                  >
                    <EventCard
                      event={event}
                      isHost={event.hostId === user.id}
                      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                    />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <Text className="text-4xl mb-2">🎉</Text>
                  <Text className="text-gray-500 mb-4">
                    まだイベントがありません
                  </Text>
                  <Button
                    title="最初のイベントを作成"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/events/create')}
                  />
                </View>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

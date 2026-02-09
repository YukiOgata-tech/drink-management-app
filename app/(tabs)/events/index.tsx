import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { EventCard } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const INITIAL_LOAD_COUNT = 10;
const LOAD_MORE_COUNT = 10;
const SHOW_ALL_PAGE_THRESHOLD = 50;

export default function EventsScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const events = useEventsStore((state) => state.events);
  const totalCount = useEventsStore((state) => state.totalCount);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const loading = useEventsStore((state) => state.loading);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (user && !isGuest) {
      fetchEvents(user.id, { limit: INITIAL_LOAD_COUNT });
    }
  }, [user, isGuest]);

  const onRefresh = async () => {
    if (!user || isGuest) return;
    setRefreshing(true);
    await fetchEvents(user.id, { limit: INITIAL_LOAD_COUNT });
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLoadMore = async () => {
    if (!user || isGuest || isLoadingMore) return;
    setIsLoadingMore(true);
    await fetchEvents(user.id, {
      limit: LOAD_MORE_COUNT,
      offset: events.length,
      append: true,
    });
    setIsLoadingMore(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleViewAll = () => {
    router.push('/(tabs)/events/all');
  };

  if (!user) return null;

  // ゲストユーザー向けの表示
  if (isGuest) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <SyncStatusBanner />
        <View className="flex-1">
          <View className={`px-6 py-6 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <View className="flex-row items-center">
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>イベント</Text>
              <Feather name="users" size={22} color="#0ea5e9" style={{ marginLeft: 8 }} />
            </View>
            <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              飲み会イベントを作成・管理
            </Text>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Feather name="lock" size={40} color={isDark ? '#9ca3af' : '#6b7280'} />
            </View>
            <Text className={`text-xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ログインが必要です
            </Text>
            <Text className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              イベント機能を利用するには{'\n'}アカウントでログインしてください
            </Text>
            <Button
              title="ログインする"
              onPress={() => router.push('/(auth)/login')}
              variant="primary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const hasMoreEvents = events.length < totalCount;
  const showViewAllButton = totalCount >= SHOW_ALL_PAGE_THRESHOLD;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* オフライン/同期ステータスバナー */}
      <SyncStatusBanner />

      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-6 py-6 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center">
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>イベント</Text>
            <Feather name="users" size={22} color="#0ea5e9" style={{ marginLeft: 8 }} />
          </View>
          <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            飲み会イベントを作成・管理
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6 py-6"
          contentContainerStyle={{ paddingBottom: 100 }}
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
                  icon={<Feather name="plus" size={20} color="#ffffff" />}
                  onPress={() => router.push('/(tabs)/events/create')}
                  fullWidth
                  size="lg"
                  variant="secondary"
                />
              </View>
              <View className="flex-1">
                <Button
                  title="QRで参加"
                  icon={<Feather name="camera" size={20} color="#6b7280" />}
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
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                イベント一覧
              </Text>
              {totalCount > 0 && (
                <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {events.length} / {totalCount}件
                </Text>
              )}
            </View>

            {events.length > 0 ? (
              <View className="space-y-3">
                {events.map((event, index) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(Math.min(250 + index * 30, 500)).duration(600)}
                  >
                    <EventCard
                      event={event}
                      isHost={event.hostId === user.id}
                      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                    />
                  </Animated.View>
                ))}

                {/* もっと読み込むボタン or すべて表示ボタン */}
                {hasMoreEvents && (
                  <View className="mt-4">
                    {showViewAllButton ? (
                      <TouchableOpacity
                        onPress={handleViewAll}
                        className={`border rounded-xl py-4 items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                      >
                        <View className="flex-row items-center">
                          <Feather name="list" size={18} color={isDark ? '#9ca3af' : '#6b7280'} style={{ marginRight: 8 }} />
                          <Text className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            すべてのイベントを表示（{totalCount}件）
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={handleLoadMore}
                        disabled={isLoadingMore}
                        className={`border rounded-xl py-4 items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${
                          isLoadingMore ? 'opacity-50' : ''
                        }`}
                      >
                        <View className="flex-row items-center">
                          <Feather
                            name={isLoadingMore ? 'loader' : 'chevron-down'}
                            size={18}
                            color={isDark ? '#9ca3af' : '#6b7280'}
                            style={{ marginRight: 8 }}
                          />
                          <Text className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {isLoadingMore ? '読み込み中...' : 'もっと読み込む'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="calendar" size={32} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </View>
                  <Text className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

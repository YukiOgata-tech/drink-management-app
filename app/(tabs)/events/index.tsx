import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, ResponsiveContainer, ResponsiveGrid, Skeleton } from '@/components/ui';
import { EventCard, EventErrorBanner } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
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
  const { isMd, isTablet } = useResponsive();

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
            <ResponsiveContainer className={isMd ? 'max-w-4xl' : ''}>
              <View className="flex-row items-center">
                <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>イベント</Text>
                <Feather name="users" size={22} color="#0ea5e9" style={{ marginLeft: 8 }} />
              </View>
              <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                飲み会イベントを作成・管理
              </Text>
            </ResponsiveContainer>
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <ResponsiveContainer maxWidth="form">
              <View className="items-center">
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
            </ResponsiveContainer>
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
      <EventErrorBanner />

      <View className="flex-1">
        {/* ヘッダー（グラデーション） */}
        <LinearGradient
          colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 22 }}
        >
          <ResponsiveContainer className={isMd ? 'max-w-4xl' : ''}>
            <View className="flex-row items-center">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Feather name="users" size={18} color="#ffffff" />
              </View>
              <Text className="text-2xl font-bold text-white">イベント</Text>
            </View>
            <Text className="text-sm mt-1 text-white/80">飲み会イベントを作成・管理</Text>
          </ResponsiveContainer>
        </LinearGradient>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100, alignItems: isMd ? 'center' : undefined }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-4xl' : ''}`}>
          {/* アクションボタン */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View className="gap-3">
              {/* イベント作成（グラデーション） */}
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/events/create')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="plus" size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">イベント作成</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* 参加方法 */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/events/scan')}
                  activeOpacity={0.8}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-3.5"
                  style={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderWidth: 1.5,
                    borderColor: isDark ? '#374151' : '#bae6fd',
                  }}
                >
                  <Feather name="camera" size={18} color="#0ea5e9" />
                  <Text className="text-primary-500 font-semibold ml-2">QRで参加</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/events/join-by-code')}
                  activeOpacity={0.8}
                  className="flex-1 flex-row items-center justify-center rounded-xl py-3.5"
                  style={{
                    backgroundColor: isDark ? '#1f2937' : '#ffffff',
                    borderWidth: 1.5,
                    borderColor: isDark ? '#374151' : '#bae6fd',
                  }}
                >
                  <Feather name="hash" size={18} color="#0ea5e9" />
                  <Text className="text-primary-500 font-semibold ml-2">コードで参加</Text>
                </TouchableOpacity>
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

            {loading && events.length === 0 ? (
              <View className="gap-3">
                {[0, 1, 2].map((i) => (
                  <Card key={i} variant="elevated">
                    <View className="flex-row items-center">
                      <Skeleton width={48} height={48} radius={16} style={{ marginRight: 12 }} />
                      <View className="flex-1">
                        <Skeleton width={'70%'} height={16} />
                        <Skeleton width={'45%'} height={12} style={{ marginTop: 8 }} />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : events.length > 0 ? (
              <>
              <ResponsiveGrid minItemWidth={340} gap={12}>
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
              </ResponsiveGrid>

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
            </>
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
          </ResponsiveContainer>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { EventCard } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import * as Haptics from 'expo-haptics';
import { Event } from '@/types';

const PAGE_SIZE = 20;

export default function AllEventsScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const events = useEventsStore((state) => state.events);
  const totalCount = useEventsStore((state) => state.totalCount);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const loading = useEventsStore((state) => state.loading);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd, numColumns } = useResponsive();

  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    if (user && !isGuest) {
      // 初回読み込み
      fetchEvents(user.id, { limit: PAGE_SIZE });
    }
  }, [user, isGuest]);

  const onRefresh = useCallback(async () => {
    if (!user || isGuest) return;
    setRefreshing(true);
    await fetchEvents(user.id, { limit: PAGE_SIZE });
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [user, isGuest, fetchEvents]);

  const handleLoadMore = useCallback(async () => {
    if (!user || isGuest || isLoadingMore || loading) return;
    if (events.length >= totalCount) return; // すべて読み込み済み

    setIsLoadingMore(true);
    await fetchEvents(user.id, {
      limit: PAGE_SIZE,
      offset: events.length,
      append: true,
    });
    setIsLoadingMore(false);
  }, [user, isGuest, isLoadingMore, loading, events.length, totalCount, fetchEvents]);

  const handleBack = () => {
    router.back();
  };

  const renderItem = useCallback(
    ({ item, index }: { item: Event; index: number }) => (
      <View
        className="mb-3"
        style={isMd ? {
          flex: 1,
          maxWidth: `${100 / numColumns}%`,
          paddingLeft: index % numColumns !== 0 ? 6 : 0,
          paddingRight: index % numColumns !== numColumns - 1 ? 6 : 0,
        } : undefined}
      >
        <EventCard
          event={item}
          isHost={item.hostId === user?.id}
          onPress={() => router.push(`/(tabs)/events/${item.id}`)}
        />
      </View>
    ),
    [user?.id, isMd, numColumns]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#0ea5e9" />
        <Text className="text-gray-500 text-sm mt-2">読み込み中...</Text>
      </View>
    );
  }, [isLoadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-gray-500 mt-4">イベントを読み込み中...</Text>
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center py-20">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
          <Feather name="calendar" size={32} color="#9ca3af" />
        </View>
        <Text className="text-gray-500">イベントがありません</Text>
      </View>
    );
  }, [loading]);

  if (!user) return null;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <SyncStatusBanner />

      {/* カスタムヘッダー */}
      <View className={`px-4 py-3 border-b flex-row items-center ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 items-center justify-center -ml-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={28} color={isDark ? '#9ca3af' : '#374151'} />
        </TouchableOpacity>
        <View className="flex-1 ml-2">
          <Text className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>すべてのイベント</Text>
          <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {totalCount}件のイベント
          </Text>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={isMd ? numColumns : 1}
        key={isMd ? `grid-${numColumns}` : 'list'}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 100,
          maxWidth: isMd ? 1200 : undefined,
          alignSelf: isMd ? 'center' : undefined,
          width: isMd ? '100%' : undefined,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

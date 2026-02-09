import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDrinksStore } from '@/stores/drinks';
import { useEventsStore } from '@/stores/events';
import { useDevStore } from '@/stores/dev';
import { useThemeStore } from '@/stores/theme';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function HomeScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const todayLogs = useDrinksStore((state) => state.todayLogs);
  const fetchTodayLogs = useDrinksStore((state) => state.fetchTodayLogs);
  const getTodayDrinkLogs = useDrinksStore((state) => state.getTodayDrinkLogs);
  const events = useEventsStore((state) => state.events);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  // 画面がフォーカスされるたびにデータを再取得
  useFocusEffect(
    useCallback(() => {
      if (user && !isGuest) {
        fetchTodayLogs(user.id);
        fetchEvents();
      }
    }, [user, isGuest])
  );

  if (!user) return null;

  // Supabaseから取得したデータを使用（ゲストの場合はローカルデータ）
  const displayLogs = isGuest ? getTodayDrinkLogs(user.id) : todayLogs;
  const totalPureAlcohol = displayLogs.reduce(
    (sum, log) => sum + log.pureAlcoholG * log.count,
    0
  );

  // 最新のイベント3件を取得（開始日時の降順でソート）
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3);

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* オフライン/同期ステータスバナー */}
      <SyncStatusBanner />

      <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
        <View className="px-6 py-8">
          {/* ヘッダー */}
          <View className="mb-8">
            <Text className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              おかえりなさい、{user.displayName.split(' ')[0]}さん
            </Text>
            <Text className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {dayjs().format('YYYY年M月D日 (ddd)')}
            </Text>
          </View>

          {/* 今日の記録サマリ */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <View className="flex-row items-center mb-4">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  今日の記録
                </Text>
                <View className="ml-2">
                  <Feather name="bar-chart-2" size={18} color="#0ea5e9" />
                </View>
              </View>
              <View className="flex-row justify-around">
                <View className={`items-center rounded-xl px-6 py-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                  <Text className="text-4xl font-bold text-primary-600">
                    {displayLogs.reduce((sum, log) => sum + log.count, 0)}
                  </Text>
                  <Text className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>杯</Text>
                </View>
                <View className={`items-center rounded-xl px-6 py-4 ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}>
                  <Text className="text-4xl font-bold text-primary-600">
                    {totalPureAlcohol.toFixed(1)}
                  </Text>
                  <Text className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    g (純アルコール)
                  </Text>
                </View>
              </View>

              {user.profile.gender && (
                <View className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    適正量: {user.profile.gender === 'male' ? '20g' : '10g'} / 日
                  </Text>
                  {totalPureAlcohol > (user.profile.gender === 'male' ? 20 : 10) && (
                    <View className="flex-row items-center mt-1">
                      <Feather name="alert-triangle" size={12} color="#dc2626" />
                      <Text className="text-xs text-red-600 font-semibold ml-1">
                        適正量を超えています。休肝日を設けましょう。
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* クイックアクション */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View className="mb-6">
              <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                クイックアクション
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push('/drinks')}
                  className="flex-1 bg-primary-500 rounded-2xl p-4 items-center active:bg-primary-600"
                >
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mb-2">
                    <Feather name="plus-circle" size={28} color="#ffffff" />
                  </View>
                  <Text className="text-white font-semibold">
                    記録を追加
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/events')}
                  className="flex-1 bg-secondary-500 rounded-2xl p-4 items-center active:bg-secondary-600"
                >
                  <View className="w-12 h-12 bg-white/20 rounded-full items-center justify-center mb-2">
                    <Feather name="users" size={28} color="#ffffff" />
                  </View>
                  <Text className="text-white font-semibold">
                    イベント
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* 直近のイベント */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                直近のイベント
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/events')}
                className="flex-row items-center"
              >
                <Text className="text-primary-600 font-semibold mr-1">
                  すべて見る
                </Text>
                <Feather name="chevron-right" size={16} color="#0ea5e9" />
              </TouchableOpacity>
            </View>

            {recentEvents.length > 0 ? (
              <View className="space-y-3">
                {recentEvents.map((event, index) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(350 + index * 50).duration(600)}
                  >
                    <TouchableOpacity
                      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                      activeOpacity={0.7}
                    >
                      <Card variant="outlined">
                        <View className="flex-row items-center">
                          <View className={`rounded-full w-12 h-12 items-center justify-center mr-3 ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
                            <Feather name="calendar" size={24} color="#0ea5e9" />
                          </View>
                          <View className="flex-1">
                            <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {event.title}
                            </Text>
                            <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                            </Text>
                          </View>
                          <View
                            className={`px-3 py-1 rounded-full ${
                              event.endedAt
                                ? (isDark ? 'bg-gray-700' : 'bg-gray-100')
                                : (isDark ? 'bg-green-900/30' : 'bg-green-100')
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                event.endedAt
                                  ? (isDark ? 'text-gray-400' : 'text-gray-600')
                                  : 'text-green-600'
                              }`}
                            >
                              {event.endedAt ? '終了' : '開催中'}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-8">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="calendar" size={32} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </View>
                  <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    イベントがありません
                  </Text>
                  <Button
                    title="イベントを作成"
                    size="sm"
                    onPress={() => router.push('/events')}
                    className="mt-4"
                  />
                </View>
              </Card>
            )}
          </Animated.View>

          {/* 健康メッセージ */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(600)}
            className="mt-6"
          >
            <Card variant="outlined" className={isDark ? 'bg-amber-900/20 border-amber-700' : 'bg-amber-50 border-amber-200'}>
              <View className="flex-row items-start">
                <View className="mt-0.5 mr-3">
                  <Feather name="info" size={20} color={isDark ? '#fbbf24' : '#b45309'} />
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    適度な飲酒を心がけましょう
                  </Text>
                  <Text className={`text-xs leading-5 ${isDark ? 'text-amber-200/80' : 'text-amber-800'}`}>
                    週に2日程度の休肝日を設けることが推奨されています。記録を見返して、自分の適量を把握しましょう。
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

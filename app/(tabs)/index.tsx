import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDrinksStore } from '@/stores/drinks';
import { useEventsStore } from '@/stores/events';
import { useDevStore } from '@/stores/dev';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function HomeScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const getTodayDrinkLogs = useDrinksStore((state) => state.getTodayDrinkLogs);
  const events = useEventsStore((state) => state.events);
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);

  if (!user) return null;

  const todayLogs = getTodayDrinkLogs(user.id);
  const totalPureAlcohol = todayLogs.reduce(
    (sum, log) => sum + log.pureAlcoholG * log.count,
    0
  );

  const recentEvents = isDummyDataEnabled ? events.slice(0, 3) : [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        <View className="px-6 py-8">
          {/* ヘッダー */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">
              おかえりなさい、{user.displayName.split(' ')[0]}さん 👋
            </Text>
            <Text className="text-sm text-gray-500 mt-2">
              {dayjs().format('YYYY年M月D日 (ddd)')}
            </Text>
          </View>

          {/* 今日の記録サマリ */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-6 bg-gradient-to-r from-primary-500 to-secondary-500">
              <Text className="text-lg font-bold text-white mb-4">
                今日の記録 📊
              </Text>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className="text-4xl font-bold text-white">
                    {todayLogs.reduce((sum, log) => sum + log.count, 0)}
                  </Text>
                  <Text className="text-sm text-white/80 mt-1">杯</Text>
                </View>
                <View className="items-center">
                  <Text className="text-4xl font-bold text-white">
                    {totalPureAlcohol.toFixed(1)}
                  </Text>
                  <Text className="text-sm text-white/80 mt-1">
                    g (純アルコール)
                  </Text>
                </View>
              </View>

              {user.profile.gender && (
                <View className="mt-4 pt-4 border-t border-white/20">
                  <Text className="text-xs text-white/90">
                    適正量: {user.profile.gender === 'male' ? '20g' : '10g'} / 日
                  </Text>
                  {totalPureAlcohol > (user.profile.gender === 'male' ? 20 : 10) && (
                    <Text className="text-xs text-amber-200 mt-1">
                      ⚠️ 適正量を超えています。休肝日を設けましょう。
                    </Text>
                  )}
                </View>
              )}
            </Card>
          </Animated.View>

          {/* クイックアクション */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <View className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">
                クイックアクション
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push('/drinks')}
                  className="flex-1 bg-primary-500 rounded-2xl p-4 items-center active:bg-primary-600"
                >
                  <Text className="text-4xl mb-2">🍺</Text>
                  <Text className="text-white font-semibold">
                    記録を追加
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/events')}
                  className="flex-1 bg-secondary-500 rounded-2xl p-4 items-center active:bg-secondary-600"
                >
                  <Text className="text-4xl mb-2">🎉</Text>
                  <Text className="text-white font-semibold">
                    イベント作成
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* 直近のイベント */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900">
                直近のイベント
              </Text>
              <TouchableOpacity onPress={() => router.push('/events')}>
                <Text className="text-primary-600 font-semibold">
                  すべて見る →
                </Text>
              </TouchableOpacity>
            </View>

            {recentEvents.length > 0 ? (
              <View className="space-y-3">
                {recentEvents.map((event, index) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(350 + index * 50).duration(600)}
                  >
                    <TouchableOpacity>
                      <Card variant="outlined">
                        <View className="flex-row items-center">
                          <View className="bg-primary-100 rounded-full w-12 h-12 items-center justify-center mr-3">
                            <Text className="text-2xl">🎉</Text>
                          </View>
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-gray-900">
                              {event.title}
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1">
                              {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                            </Text>
                          </View>
                          <View
                            className={`px-3 py-1 rounded-full ${
                              event.endedAt
                                ? 'bg-gray-100'
                                : 'bg-green-100'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                event.endedAt
                                  ? 'text-gray-600'
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
                  <Text className="text-4xl mb-2">🎉</Text>
                  <Text className="text-gray-500">
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
            <Card variant="outlined" className="bg-amber-50 border-amber-200">
              <View className="flex-row items-start">
                <Text className="text-2xl mr-3">💡</Text>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-amber-900 mb-1">
                    適度な飲酒を心がけましょう
                  </Text>
                  <Text className="text-xs text-amber-800 leading-5">
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

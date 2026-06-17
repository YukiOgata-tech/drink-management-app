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
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, ProgressRing, ResponsiveContainer, ResponsiveGrid } from '@/components/ui';
import { EndedEventBanner } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { getXPInfo, getXPToNextLevel } from '@/lib/xp';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function HomeScreen() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const events = useEventsStore((state) => state.events);
  const fetchEvents = useEventsStore((state) => state.fetchEvents);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  // 個人記録ストア
  const personalLogs = usePersonalLogsStore((state) => state.logs);
  const loadPersonalLogs = usePersonalLogsStore((state) => state.loadLogs);

  // 画面がフォーカスされるたびにデータを再取得
  useFocusEffect(
    useCallback(() => {
      loadPersonalLogs();
      if (user && !isGuest) {
        fetchEvents(user.id);
      }
    }, [user, isGuest])
  );

  if (!user) return null;

  // 今日の個人記録（削除済みを除外）
  const today = dayjs().format('YYYY-MM-DD');
  const todayPersonalLogs = personalLogs.filter(
    (log) => dayjs(log.recordedAt).format('YYYY-MM-DD') === today && !log.deletedAt
  );

  const totalPureAlcohol = todayPersonalLogs.reduce(
    (sum, log) => sum + log.pureAlcoholG * log.count,
    0
  );
  const totalCount = todayPersonalLogs.reduce((sum, log) => sum + log.count, 0);

  // 適正量と進捗
  const dailyLimit = user.profile.gender === 'female' ? 10 : 20;
  const limitPct = dailyLimit > 0 ? (totalPureAlcohol / dailyLimit) * 100 : 0;
  const overLimit = totalPureAlcohol > dailyLimit;
  const ringColor = limitPct >= 100 ? '#ef4444' : limitPct >= 80 ? '#f59e0b' : '#10b981';
  const ringTrack = isDark ? '#374151' : '#e5e7eb';

  // XP / レベル
  const totalXP = user.profile.totalXP ?? 0;
  const negativeXP = user.profile.negativeXP ?? 0;
  const xpInfo = getXPInfo(totalXP, negativeXP);
  const xpToNext = getXPToNextLevel(totalXP);

  // 最新イベント3件
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 3);

  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <SyncStatusBanner />
      <EndedEventBanner />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100, alignItems: isMd ? 'center' : undefined }}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer className={`px-5 pt-3 ${isMd ? 'max-w-3xl' : ''}`}>
          {/* ===== ヒーロー（グラデーション） ===== */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient
              colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 22 }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-white/80 text-xs font-medium">
                    {dayjs().format('YYYY年M月D日 (ddd)')}
                  </Text>
                  <Text className="text-white text-2xl font-bold mt-1.5" numberOfLines={1}>
                    おかえりなさい
                  </Text>
                  <Text className="text-white text-2xl font-bold" numberOfLines={1}>
                    {user.displayName.split(' ')[0]} さん
                  </Text>
                </View>

                {/* レベルバッジ */}
                <View
                  className="items-center justify-center rounded-2xl px-4 py-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                >
                  <Text className="text-white/80 text-[10px] font-semibold tracking-wider">LEVEL</Text>
                  <Text className="text-white text-2xl font-extrabold leading-7">{xpInfo.level}</Text>
                </View>
              </View>

              {/* XPプログレス */}
              <View className="mt-5">
                <View className="flex-row items-center justify-between mb-1.5">
                  <Text className="text-white/90 text-xs font-semibold">
                    {isGuest ? 'ゲストモード' : `経験値 ${totalXP.toLocaleString()} XP`}
                  </Text>
                  <Text className="text-white/70 text-[11px]">
                    {isGuest ? 'ログインで記録を保存' : `次のレベルまで ${xpToNext.toLocaleString()} XP`}
                  </Text>
                </View>
                <View
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  <View
                    className="h-2 rounded-full"
                    style={{ width: `${Math.max(4, xpInfo.progress)}%`, backgroundColor: '#ffffff' }}
                  />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ===== 今日の記録（円形プログレス） ===== */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} className="mt-5">
            <Card variant="elevated">
              <View className="flex-row items-center mb-4">
                <Feather name="activity" size={18} color={ringColor} />
                <Text className={`text-base font-bold ml-2 ${textMain}`}>今日の記録</Text>
              </View>

              <View className="flex-row items-center">
                <ProgressRing
                  progress={limitPct}
                  size={116}
                  strokeWidth={11}
                  color={ringColor}
                  trackColor={ringTrack}
                >
                  <Text className={`text-2xl font-extrabold ${textMain}`}>
                    {totalPureAlcohol.toFixed(1)}
                  </Text>
                  <Text className={`text-[10px] ${textSub}`}>g 純アルコール</Text>
                </ProgressRing>

                <View className="flex-1 ml-5">
                  {/* 杯数 */}
                  <View className="flex-row items-baseline">
                    <Text className={`text-3xl font-extrabold ${textMain}`}>{totalCount}</Text>
                    <Text className={`text-sm ml-1 ${textSub}`}>杯</Text>
                  </View>

                  {/* 適正量バッジ */}
                  <View
                    className="flex-row items-center self-start mt-2 px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: overLimit
                        ? (isDark ? 'rgba(239,68,68,0.18)' : '#fef2f2')
                        : (isDark ? 'rgba(16,185,129,0.16)' : '#f0fdf4'),
                    }}
                  >
                    <Feather
                      name={overLimit ? 'alert-triangle' : 'check-circle'}
                      size={12}
                      color={overLimit ? '#ef4444' : '#10b981'}
                    />
                    <Text
                      className="text-[11px] font-semibold ml-1"
                      style={{ color: overLimit ? '#ef4444' : '#10b981' }}
                    >
                      適正量 {dailyLimit}g / 日
                    </Text>
                  </View>

                  <Text className={`text-xs mt-2 leading-4 ${textSub}`}>
                    {overLimit
                      ? '適正量を超えています。休肝日を設けましょう。'
                      : totalCount === 0
                        ? 'まだ今日の記録はありません。'
                        : `適正量まで残り ${Math.max(0, dailyLimit - totalPureAlcohol).toFixed(1)}g`}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* ===== クイックアクション ===== */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} className="mt-5">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.push('/drinks')}
                activeOpacity={0.85}
                className="flex-1"
              >
                <LinearGradient
                  colors={['#0ea5e9', '#6366f1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 20, padding: 16 }}
                >
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                  >
                    <Feather name="plus" size={24} color="#ffffff" />
                  </View>
                  <Text className="text-white font-bold text-base">記録を追加</Text>
                  <Text className="text-white/75 text-xs mt-0.5">飲んだものを記録</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/events')}
                activeOpacity={0.85}
                className="flex-1"
              >
                <LinearGradient
                  colors={['#8b5cf6', '#d946ef']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 20, padding: 16 }}
                >
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
                  >
                    <Feather name="users" size={22} color="#ffffff" />
                  </View>
                  <Text className="text-white font-bold text-base">イベント</Text>
                  <Text className="text-white/75 text-xs mt-0.5">みんなで記録</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ===== 直近のイベント ===== */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)} className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-base font-bold ${textMain}`}>直近のイベント</Text>
              <TouchableOpacity onPress={() => router.push('/events')} className="flex-row items-center">
                <Text className="text-primary-500 font-semibold mr-1 text-sm">すべて見る</Text>
                <Feather name="chevron-right" size={16} color="#0ea5e9" />
              </TouchableOpacity>
            </View>

            {recentEvents.length > 0 ? (
              <ResponsiveGrid minItemWidth={280} gap={12}>
                {recentEvents.map((event, index) => {
                  const ongoing = !event.endedAt;
                  return (
                    <Animated.View
                      key={event.id}
                      entering={FadeInDown.delay(350 + index * 60).duration(500)}
                    >
                      <TouchableOpacity
                        onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                        activeOpacity={0.7}
                      >
                        <Card variant="elevated">
                          <View className="flex-row items-center">
                            <View
                              className="rounded-2xl w-12 h-12 items-center justify-center mr-3"
                              style={{ backgroundColor: ongoing ? (isDark ? 'rgba(14,165,233,0.18)' : '#e0f2fe') : (isDark ? '#374151' : '#f3f4f6') }}
                            >
                              <Feather name="calendar" size={22} color={ongoing ? '#0ea5e9' : (isDark ? '#9ca3af' : '#9ca3af')} />
                            </View>
                            <View className="flex-1">
                              <Text className={`text-base font-semibold ${textMain}`} numberOfLines={1}>
                                {event.title}
                              </Text>
                              <Text className={`text-sm mt-0.5 ${textSub}`}>
                                {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                              </Text>
                            </View>
                            <View
                              className="px-2.5 py-1 rounded-full flex-row items-center"
                              style={{ backgroundColor: ongoing ? (isDark ? 'rgba(16,185,129,0.18)' : '#dcfce7') : (isDark ? '#374151' : '#f3f4f6') }}
                            >
                              {ongoing && (
                                <View className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: '#10b981' }} />
                              )}
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: ongoing ? '#10b981' : (isDark ? '#9ca3af' : '#6b7280') }}
                              >
                                {ongoing ? '開催中' : '終了'}
                              </Text>
                            </View>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ResponsiveGrid>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-8">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="calendar" size={30} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </View>
                  <Text className={textSub}>イベントがありません</Text>
                  <Button title="イベントを作成" size="sm" onPress={() => router.push('/events')} className="mt-4" />
                </View>
              </Card>
            )}
          </Animated.View>

          {/* ===== 健康メッセージ ===== */}
          <Animated.View entering={FadeInDown.delay(450).duration(500)} className="mt-6">
            <View
              className="flex-row items-start rounded-2xl p-4"
              style={{
                backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#fde68a',
              }}
            >
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
          </Animated.View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

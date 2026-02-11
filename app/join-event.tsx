import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { Event } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function JoinEventScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const { fetchEventByInviteCode, addEventMember } = useEventsStore();
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError('招待コードが無効です');
      setLoading(false);
      return;
    }

    loadEvent();
  }, [code]);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);

    try {
      const fetchedEvent = await fetchEventByInviteCode(code!);

      if (!fetchedEvent) {
        setError('イベントが見つかりませんでした');
        setLoading(false);
        return;
      }

      setEvent(fetchedEvent);
      setLoading(false);
    } catch (err) {
      console.error('Error loading event:', err);
      setError('イベントの読み込みに失敗しました');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !event) return;

    // ゲストユーザーはイベント参加不可
    if (isGuest) {
      Alert.alert(
        'ログインが必要です',
        'イベントに参加するにはログインしてください',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'ログイン', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await addEventMember({
        eventId: event.id,
        userId: user.id,
        role: 'member',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert('参加完了', 'イベントに参加しました', [
        {
          text: 'イベントを見る',
          onPress: () => router.replace(`/(tabs)/events/${event.id}`),
        },
      ]);
    } catch (err) {
      console.error('Error joining event:', err);
      Alert.alert('エラー', '参加に失敗しました。もう一度お試しください。');
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>イベントを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <View className="flex-1 items-center justify-center px-6">
          <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
            <Feather name="alert-circle" size={40} color="#ef4444" />
          </View>
          <Text className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            エラー
          </Text>
          <Text className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {error || 'イベントが見つかりませんでした'}
          </Text>
          <View className="space-y-3 w-full max-w-xs">
            <Button
              title="もう一度試す"
              onPress={loadEvent}
              fullWidth
              variant="primary"
            />
            <Button
              title="ホームに戻る"
              onPress={handleCancel}
              fullWidth
              variant="outline"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const recordingRuleConfig: Record<string, { icon: keyof typeof Feather.glyphMap; name: string; description: string }> = {
    self: { icon: 'edit-3', name: '各自入力', description: '各参加者が自由に記録' },
    host_only: {
      icon: 'shield',
      name: 'ホスト管理',
      description: 'ホストが記録を管理',
    },
    consensus: {
      icon: 'users',
      name: '同意制',
      description: '承認が必要',
    },
  };

  const ruleInfo = recordingRuleConfig[event.recordingRule];

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingVertical: 32,
          alignItems: isMd ? 'center' : undefined,
        }}
      >
        <ResponsiveContainer className={isMd ? 'max-w-md w-full' : 'w-full'}>
        <View className="flex-1 justify-center">
          {/* イベント情報 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View className="items-center mb-8">
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${isDark ? 'bg-secondary-900/30' : 'bg-secondary-100'}`}>
                <Feather name="calendar" size={40} color="#f97316" />
              </View>
              <Text className={`text-2xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                イベントへの招待
              </Text>
              <Text className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                以下のイベントに参加しますか？
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Card variant="elevated" className="mb-8">
              <View className="items-center py-4">
                <Text className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {event.title}
                </Text>
                {event.description && (
                  <Text className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {event.description}
                  </Text>
                )}
                <View className={`w-full rounded-xl p-4 space-y-3 ${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <InfoRow
                    icon="clock"
                    label="開始日時"
                    value={dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                  />
                  <InfoRow
                    icon={ruleInfo.icon}
                    label="記録ルール"
                    value={`${ruleInfo.name} - ${ruleInfo.description}`}
                  />
                  <InfoRow
                    icon="link"
                    label="招待コード"
                    value={event.inviteCode}
                  />
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* アクションボタン */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)}>
            <View className="space-y-3">
              <Button
                title={joining ? '参加中...' : '参加する'}
                onPress={handleJoin}
                disabled={joining}
                fullWidth
                size="lg"
                variant="secondary"
              />
              <Button
                title="キャンセル"
                onPress={handleCancel}
                disabled={joining}
                fullWidth
                variant="outline"
              />
            </View>
          </Animated.View>
        </View>

        {/* 注意事項 */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(600)}
          className="mt-6"
        >
          <Card variant="outlined" className={`border-blue-200 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <Text className={`text-xs text-center leading-5 ${isDark ? 'text-blue-300' : 'text-blue-800'}`}>
              参加後、イベント内の飲酒記録を閲覧できます。記録ルールに従って、記録の追加や承認ができます。
            </Text>
          </Card>
        </Animated.View>
        </ResponsiveContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start">
      <Feather name={icon} size={18} color="#6b7280" style={{ marginRight: 8 }} />
      <View className="flex-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-sm font-semibold text-gray-900 mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}

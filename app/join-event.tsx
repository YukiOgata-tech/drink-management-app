import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function JoinEventScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const user = useUserStore((state) => state.user);
  const {
    fetchEventByInviteCode,
    addEventMember,
    getEventById,
  } = useEventsStore();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      Alert.alert('エラー', '招待コードが無効です', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      return;
    }

    loadEvent();
  }, [code]);

  const loadEvent = async () => {
    setLoading(true);
    const event = await fetchEventByInviteCode(code);

    if (!event) {
      Alert.alert('エラー', 'イベントが見つかりませんでした', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
      setLoading(false);
      return;
    }

    setEventId(event.id);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !eventId) return;

    setJoining(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await addEventMember({
      eventId,
      userId: user.id,
      role: 'member',
    });

    setJoining(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert('参加完了', 'イベントに参加しました', [
      {
        text: 'イベントを見る',
        onPress: () => router.replace(`/(tabs)/events/${eventId}`),
      },
    ]);
  };

  const handleCancel = () => {
    router.replace('/(tabs)');
  };

  const event = eventId ? getEventById(eventId) : null;

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text className="text-gray-500 mt-4">イベントを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return null;
  }

  const recordingRuleConfig = {
    self: { emoji: '✍️', name: '各自入力', description: '各参加者が自由に記録' },
    host_only: {
      emoji: '👑',
      name: 'ホスト管理',
      description: 'ホストが記録を管理',
    },
    consensus: {
      emoji: '🤝',
      name: '同意制',
      description: '承認が必要',
    },
  };

  const ruleInfo = recordingRuleConfig[event.recordingRule];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-1 px-6 py-8">
        <View className="flex-1 justify-center">
          {/* イベント情報 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View className="items-center mb-8">
              <Text className="text-5xl mb-4">🎉</Text>
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                イベントへの招待
              </Text>
              <Text className="text-sm text-gray-500 text-center">
                以下のイベントに参加しますか？
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Card variant="elevated" className="mb-8">
              <View className="items-center py-4">
                <Text className="text-xl font-bold text-gray-900 mb-4">
                  {event.title}
                </Text>
                {event.description && (
                  <Text className="text-sm text-gray-600 text-center mb-4">
                    {event.description}
                  </Text>
                )}
                <View className="w-full bg-gray-50 rounded-xl p-4 space-y-3">
                  <InfoRow
                    icon="📅"
                    label="開始日時"
                    value={dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                  />
                  <InfoRow
                    icon={ruleInfo.emoji}
                    label="記録ルール"
                    value={`${ruleInfo.name} - ${ruleInfo.description}`}
                  />
                  <InfoRow
                    icon="🔗"
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
          <Card variant="outlined" className="bg-blue-50 border-blue-200">
            <Text className="text-xs text-blue-800 text-center leading-5">
              参加後、イベント内の飲酒記録を閲覧できます。記録ルールに従って、記録の追加や承認ができます。
            </Text>
          </Card>
        </Animated.View>
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
      <Text className="text-lg mr-2">{icon}</Text>
      <View className="flex-1">
        <Text className="text-xs text-gray-500">{label}</Text>
        <Text className="text-sm font-semibold text-gray-900 mt-0.5">
          {value}
        </Text>
      </View>
    </View>
  );
}

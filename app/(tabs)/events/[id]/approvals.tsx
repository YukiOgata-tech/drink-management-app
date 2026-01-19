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
import { Card } from '@/components/ui';
import { ApprovalCard } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import { DrinkLog } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function ApprovalsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const event = useEventsStore((state) => state.getEventById(id));

  const [drinkLogs, setDrinkLogs] = useState<DrinkLog[]>([]);
  const [approvals, setApprovals] = useState<
    Map<string, { approvedByUserId: string; approvedAt: string }[]>
  >(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    await loadDrinkLogs();
    setLoading(false);
  };

  const loadDrinkLogs = async () => {
    const { drinkLogs: logs, error } =
      await DrinkLogsAPI.getDrinkLogsByEvent(id);
    if (!error && logs) {
      const pendingLogs = logs.filter((log) => log.status === 'pending');
      setDrinkLogs(pendingLogs);

      // 各記録の承認数を取得
      const approvalsMap = new Map();
      for (const log of pendingLogs) {
        const { approvals: logApprovals } =
          await DrinkLogsAPI.getDrinkLogApprovals(log.id);
        if (logApprovals) {
          approvalsMap.set(log.id, logApprovals);
        }
      }
      setApprovals(approvalsMap);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleApprove = async (drinkLogId: string, recorderId: string) => {
    if (!user) return;

    // 本人の記録は承認できない
    if (recorderId === user.id) {
      Alert.alert('エラー', '自分の記録は承認できません');
      return;
    }

    // すでに承認済みかチェック
    const logApprovals = approvals.get(drinkLogId) || [];
    const alreadyApproved = logApprovals.some(
      (a) => a.approvedByUserId === user.id
    );

    if (alreadyApproved) {
      Alert.alert('エラー', 'すでに承認済みです');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await DrinkLogsAPI.approveDrinkLog({
      drinkLogId,
      approvedByUserId: user.id,
    });

    if (error) {
      Alert.alert('エラー', error.message || '承認に失敗しました');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('承認完了', '記録を承認しました');
    onRefresh();
  };

  if (!user || !event) {
    router.back();
    return null;
  }

  if (event.recordingRule !== 'consensus') {
    Alert.alert(
      '利用不可',
      'この機能は同意制モードのイベントでのみ利用できます',
      [{ text: 'OK', onPress: () => router.back() }]
    );
    return null;
  }

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
            <Text className="text-2xl font-bold text-gray-900">承認待ち</Text>
            <View className="bg-yellow-100 px-3 py-1 rounded-full">
              <Text className="text-sm font-semibold text-yellow-700">
                {drinkLogs.length}件
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
          {drinkLogs.length > 0 ? (
            <View className="space-y-3">
              {drinkLogs.map((log, index) => {
                const logApprovals = approvals.get(log.id) || [];
                const canApprove = log.userId !== user.id;
                const hasUserApproved = logApprovals.some(
                  (a) => a.approvedByUserId === user.id
                );

                return (
                  <Animated.View
                    key={log.id}
                    entering={FadeInDown.delay(100 + index * 30).duration(600)}
                  >
                    <ApprovalCard
                      log={log}
                      userName={`ユーザー`}
                      currentApprovals={logApprovals.length}
                      requiredApprovals={event.requiredApprovals}
                      canApprove={canApprove && !hasUserApproved}
                      onApprove={() => handleApprove(log.id, log.userId)}
                    />
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Card variant="outlined">
                <View className="items-center py-12">
                  <Text className="text-5xl mb-4">✅</Text>
                  <Text className="text-gray-900 font-semibold text-lg mb-2">
                    承認待ちの記録はありません
                  </Text>
                  <Text className="text-gray-500 text-center">
                    全ての記録が承認されています
                  </Text>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 説明 */}
          {drinkLogs.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              className="mt-6"
            >
              <Card variant="outlined" className="bg-blue-50 border-blue-200">
                <Text className="text-sm font-bold text-blue-900 mb-2">
                  💡 承認について
                </Text>
                <Text className="text-xs text-blue-800 leading-5">
                  • 各記録は{event.requiredApprovals}
                  人以上の承認で自動的に承認されます{'\n'}
                  • 自分の記録は承認できません{'\n'}• 承認後は取り消しできません
                </Text>
              </Card>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

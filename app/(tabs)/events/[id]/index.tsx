import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
import { DrinkLogCard, ParticipantRow } from '@/components/event';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import { DrinkLogWithUser } from '@/types';
import { XP_VALUES } from '@/lib/xp';
import Animated, { FadeInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

interface EventResultData {
  eventCompleteXP: number;
  drinkLogsCount: number;
  drinkLogsXP: number;
  totalXP: number;
  leveledUp: boolean;
  newLevel?: number;
  debtPaid: number;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isGuest, addXP } = useUserStore();
  const {
    getEventById,
    getEventMembers,
    fetchEventById,
    fetchEventMembers,
    updateEvent,
    endEvent,
  } = useEventsStore();
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [drinkLogs, setDrinkLogs] = useState<DrinkLogWithUser[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultData, setResultData] = useState<EventResultData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const event = getEventById(id);
  const members = getEventMembers(id);

  // 画面がフォーカスされるたびにデータを再取得
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEventById(id),
      fetchEventMembers(id),
      loadDrinkLogs(),
    ]);
    setLoading(false);
  };

  const loadDrinkLogs = async () => {
    const { drinkLogs: logs, error } = await DrinkLogsAPI.getDrinkLogsByEvent(id);
    if (!error && logs) {
      setDrinkLogs(logs);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleEndEvent = () => {
    Alert.alert(
      'イベントを終了',
      'イベントを終了しますか？終了後も記録は閲覧できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '終了する',
          style: 'destructive',
          onPress: async () => {
            await endEvent(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // 認証ユーザーの場合、イベント完了XPを付与
            if (!isGuest && user) {
              try {
                // イベント完了XP付与
                const xpResult = await addXP(XP_VALUES.EVENT_COMPLETE, 'event_complete');

                // このイベントで自分が記録した飲酒記録を計算
                const myLogs = drinkLogs.filter(
                  (log) => log.userId === user.id && log.status === 'approved'
                );
                const drinkLogsCount = myLogs.reduce((sum, log) => sum + log.count, 0);
                // 飲酒記録で得たXP（既に付与済みだが表示用、純アルコール量ベース）
                const drinkLogsXP = myLogs.reduce(
                  (sum, log) => sum + Math.floor(log.pureAlcoholG), 0
                );

                // 結果データを設定
                setResultData({
                  eventCompleteXP: XP_VALUES.EVENT_COMPLETE,
                  drinkLogsCount,
                  drinkLogsXP,
                  totalXP: XP_VALUES.EVENT_COMPLETE + drinkLogsXP,
                  leveledUp: xpResult.leveledUp,
                  newLevel: xpResult.newLevel,
                  debtPaid: xpResult.debtPaid,
                });
                setShowResultModal(true);
              } catch (error) {
                console.error('Error granting event complete XP:', error);
                // XP付与エラーでもイベント一覧に戻る
                router.replace('/(tabs)/events');
              }
            } else {
              // ゲストユーザーはXP無しでイベント一覧に戻る
              router.replace('/(tabs)/events');
            }
          },
        },
      ]
    );
  };

  const openEditModal = () => {
    if (event) {
      setEditTitle(event.title);
      setEditDescription(event.description || '');
      setShowEditModal(true);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editTitle.trim()) {
      Alert.alert('エラー', 'イベント名を入力してください');
      return;
    }

    setIsUpdating(true);
    try {
      await updateEvent(id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
      await fetchEventById(id);
    } catch (error) {
      Alert.alert('エラー', '更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!user || !event) {
    return (
      <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <View className="flex-1 items-center justify-center">
          <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = event.hostId === user.id;
  const isActive = !event.endedAt;
  const currentMember = members.find((m) => m.userId === user.id);
  const canManage =
    currentMember &&
    (currentMember.role === 'host' || currentMember.role === 'manager');

  // 承認待ち件数
  const pendingCount = drinkLogs.filter((log) => log.status === 'pending').length;

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Feather name="arrow-left" size={16} color="#0284c7" />
              <Text className="text-primary-600 font-semibold text-base ml-1">
                戻る
              </Text>
            </TouchableOpacity>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity
                onPress={onRefresh}
                disabled={refreshing}
                className="p-2"
                activeOpacity={0.7}
              >
                <Feather
                  name="refresh-cw"
                  size={18}
                  color={refreshing ? '#9ca3af' : '#0284c7'}
                />
              </TouchableOpacity>
              {isHost && isActive && (
                <TouchableOpacity onPress={handleEndEvent}>
                  <Text className="text-red-500 font-semibold text-base">
                    終了
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className={`text-2xl font-bold flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {event.title}
                </Text>
                {isHost && isActive && (
                  <TouchableOpacity
                    onPress={openEditModal}
                    className="ml-2 p-2 bg-gray-100 rounded-full"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={16} color="#6b7280" />
                  </TouchableOpacity>
                )}
              </View>
              {event.description && (
                <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {event.description}
                </Text>
              )}
              {/* 開始日時と記録ルール */}
              <View className="flex-row flex-wrap items-center mt-2 gap-2">
                <View className={`flex-row items-center rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Feather name="calendar" size={12} color={isDark ? '#9ca3af' : '#374151'} style={{ marginRight: 4 }} />
                  <Text className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {dayjs(event.startedAt).format('M/D (ddd) HH:mm')}
                  </Text>
                </View>
                <View className={`flex-row items-center rounded-full px-3 py-1 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <Feather
                    name={event.recordingRule === 'self' ? 'edit-3' : event.recordingRule === 'host_only' ? 'shield' : 'users'}
                    size={12}
                    color={isDark ? '#9ca3af' : '#374151'}
                    style={{ marginRight: 4 }}
                  />
                  <Text className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {event.recordingRule === 'self'
                      ? '各自入力'
                      : event.recordingRule === 'host_only'
                      ? 'ホスト管理'
                      : `同意制(${event.requiredApprovals}人)`}
                  </Text>
                </View>
              </View>
            </View>
            <View
              className={`px-3 py-1 rounded-full ml-2 ${
                isActive ? 'bg-green-100' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  isActive ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {isActive ? '開催中' : '終了'}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: 100,
            paddingHorizontal: 24,
            paddingVertical: 24,
            alignItems: isMd ? 'center' : undefined,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <ResponsiveContainer className={isMd ? 'max-w-3xl w-full' : 'w-full'}>
          {/* クイックアクション */}
          {isActive && (
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Card variant="elevated" className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  アクション
                </Text>
                <View className="space-y-2">
                  {(event.recordingRule === 'self' || canManage) && (
                    <Button
                      title="飲酒記録を追加"
                      icon={<Feather name="plus-circle" size={20} color="#ffffff" />}
                      onPress={() =>
                        router.push(`/(tabs)/events/${id}/add-drink`)
                      }
                      fullWidth
                      variant="primary"
                    />
                  )}
                  {event.recordingRule === 'consensus' && pendingCount > 0 && (
                    <Button
                      title={`承認待ち (${pendingCount})`}
                      icon={<Feather name="clock" size={20} color="#ffffff" />}
                      onPress={() =>
                        router.push(`/(tabs)/events/${id}/approvals`)
                      }
                      fullWidth
                      variant="secondary"
                    />
                  )}
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 招待コード */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mb-6"
          >
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/events/${id}/invite`)}
              activeOpacity={0.7}
            >
              <Card variant="elevated">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Feather name="link-2" size={18} color="#6b7280" style={{ marginRight: 8 }} />
                    <Text className="text-sm text-gray-500">招待コード</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Text className="text-xl font-bold text-primary-600 tracking-widest mr-2">
                      {event.inviteCode || '---'}
                    </Text>
                    <Feather name="chevron-right" size={18} color="#9ca3af" />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          </Animated.View>

          {/* 参加者 */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mb-6"
          >
            <Text className="text-lg font-bold text-gray-900 mb-3">
              参加者 ({members.length}人)
            </Text>
            <Card variant="elevated">
              {members.map((member) => (
                <ParticipantRow
                  key={`${member.userId}-${member.eventId}`}
                  member={member}
                  userName={member.displayName || '名無し'}
                  userAvatar={member.avatar}
                  totalDrinks={
                    drinkLogs
                      .filter(
                        (log) =>
                          log.userId === member.userId &&
                          log.status === 'approved'
                      )
                      .reduce((sum, log) => sum + log.count, 0)
                  }
                  totalAlcohol={
                    drinkLogs
                      .filter(
                        (log) =>
                          log.userId === member.userId &&
                          log.status === 'approved'
                      )
                      .reduce((sum, log) => sum + log.pureAlcoholG * log.count, 0)
                  }
                />
              ))}
            </Card>
          </Animated.View>

          {/* 最近の記録 */}
          <Animated.View entering={FadeInDown.delay(250).duration(600)}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                最近の記録
              </Text>
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/events/${id}/ranking`)}
                className="flex-row items-center bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1.5"
                activeOpacity={0.7}
              >
                <Feather name="award" size={14} color="#a16207" style={{ marginRight: 4 }} />
                <Text className="text-sm font-semibold text-yellow-700">ランキング</Text>
              </TouchableOpacity>
            </View>
            {drinkLogs.length > 0 ? (
              <View className="space-y-3">
                {drinkLogs.slice(0, 10).map((log, index) => (
                  <Animated.View
                    key={log.id}
                    entering={FadeInDown.delay(300 + index * 20).duration(600)}
                  >
                    <DrinkLogCard
                      log={log}
                      userName={log.userName || '名無し'}
                      showStatus={event.recordingRule === 'consensus'}
                    />
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-8">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="file-text" size={32} color="#9ca3af" />
                  </View>
                  <Text className={isDark ? 'text-gray-400' : 'text-gray-500'}>まだ記録がありません</Text>
                </View>
              </Card>
            )}
          </Animated.View>
          </ResponsiveContainer>
        </ScrollView>
      </View>

      {/* イベント終了結果モーダル */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowResultModal(false);
          router.replace('/(tabs)/events');
        }}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center"
          onPress={() => {
            setShowResultModal(false);
            router.replace('/(tabs)/events');
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={ZoomIn.duration(300)}
              className="bg-white mx-6 rounded-2xl p-6 min-w-[300px]"
            >
              <View className="items-center mb-4">
                <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center">
                  <Feather name="check-circle" size={48} color="#16a34a" />
                </View>
              </View>
              <Text className="text-2xl font-bold text-center text-gray-900 mb-2">
                イベント終了！
              </Text>
              <Text className="text-center text-gray-500 mb-6">
                お疲れさまでした
              </Text>

              {resultData && (
                <>
                  {/* XP獲得サマリー */}
                  <View className="bg-gray-50 rounded-xl p-4 mb-4">
                    <Text className="text-sm font-semibold text-gray-500 mb-3">
                      獲得XP
                    </Text>
                    <View className="space-y-2">
                      <View className="flex-row justify-between">
                        <Text className="text-gray-700">イベント完了ボーナス</Text>
                        <Text className="font-bold text-primary-600">
                          +{resultData.eventCompleteXP} XP
                        </Text>
                      </View>
                      {resultData.drinkLogsCount > 0 && (
                        <View className="flex-row justify-between">
                          <Text className="text-gray-700">
                            飲酒記録 ({resultData.drinkLogsCount}杯)
                          </Text>
                          <Text className="font-bold text-primary-600">
                            +{resultData.drinkLogsXP} XP
                          </Text>
                        </View>
                      )}
                      <View className="border-t border-gray-200 pt-2 mt-2 flex-row justify-between">
                        <Text className="font-bold text-gray-900">合計</Text>
                        <Text className="font-bold text-xl text-primary-600">
                          +{resultData.totalXP} XP
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* レベルアップ表示 */}
                  {resultData.leveledUp && resultData.newLevel && (
                    <Animated.View
                      entering={FadeIn.delay(200).duration(400)}
                      className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4"
                    >
                      <View className="items-center mb-2">
                        <Feather name="trending-up" size={32} color="#ca8a04" />
                      </View>
                      <Text className="text-center font-bold text-yellow-800">
                        レベルアップ！
                      </Text>
                      <Text className="text-center text-2xl font-bold text-yellow-600 mt-1">
                        Lv. {resultData.newLevel}
                      </Text>
                    </Animated.View>
                  )}

                  {/* 借金XP返済表示 */}
                  {resultData.debtPaid > 0 && (
                    <Animated.View
                      entering={FadeIn.delay(300).duration(400)}
                      className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4"
                    >
                      <View className="flex-row items-center justify-center">
                        <Feather name="check-circle" size={14} color="#166534" />
                        <Text className="text-center text-green-800 text-sm ml-1">
                          借金XP {resultData.debtPaid} を返済しました
                        </Text>
                      </View>
                    </Animated.View>
                  )}
                </>
              )}

              <Button
                title="閉じる"
                onPress={() => {
                  setShowResultModal(false);
                  router.replace('/(tabs)/events');
                }}
                fullWidth
                variant="primary"
              />
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* イベント編集モーダル */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <Pressable
            className="flex-1 bg-black/50 items-center justify-center"
            onPress={() => setShowEditModal(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className="bg-white mx-6 rounded-2xl p-6 w-[90%] max-w-[400px]"
            >
              <Text className="text-xl font-bold text-gray-900 mb-4">
                イベントを編集
              </Text>

              {/* イベント名 */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  イベント名 *
                </Text>
                <TextInput
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="例: 忘年会"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* 説明文 */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  説明文（任意）
                </Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="例: 会社の忘年会です"
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                  placeholderTextColor="#9ca3af"
                  style={{ minHeight: 80, textAlignVertical: 'top' }}
                />
              </View>

              {/* ボタン */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    title="キャンセル"
                    onPress={() => setShowEditModal(false)}
                    variant="outline"
                    fullWidth
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title={isUpdating ? '保存中...' : '保存'}
                    onPress={handleUpdateEvent}
                    variant="primary"
                    fullWidth
                    disabled={isUpdating}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

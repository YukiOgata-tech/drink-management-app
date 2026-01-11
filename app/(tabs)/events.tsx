import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Input } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useDevStore } from '@/stores/dev';
import { Event, EventRecordingRule } from '@/types';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function EventsScreen() {
  const user = useUserStore((state) => state.user);
  const events = useEventsStore((state) => state.events);
  const addEvent = useEventsStore((state) => state.addEvent);
  const addEventMember = useEventsStore((state) => state.addEventMember);
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordingRule, setRecordingRule] = useState<EventRecordingRule>('self');

  if (!user) return null;

  const handleCreateEvent = () => {
    if (!title.trim()) return;

    const newEvent: Event = {
      id: `event-${Date.now()}`,
      title,
      description,
      startedAt: new Date().toISOString(),
      recordingRule,
      hostId: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addEvent(newEvent);
    addEventMember({
      eventId: newEvent.id,
      userId: user.id,
      role: 'host',
      joinedAt: new Date().toISOString(),
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setRecordingRule('self');
  };

  const recordingRules = [
    {
      id: 'self' as EventRecordingRule,
      name: 'Self（各自入力）',
      description: '各参加者が自分の記録を自由に追加できます',
      emoji: '✍️',
    },
    {
      id: 'host_only' as EventRecordingRule,
      name: 'Host Only（ホスト管理）',
      description: 'ホストやマネージャーのみが記録を管理します',
      emoji: '👑',
    },
    {
      id: 'consensus' as EventRecordingRule,
      name: 'Consensus（同意制）',
      description: '記録には他の参加者の承認が必要です',
      emoji: '🤝',
    },
  ];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="px-6 py-6 bg-white border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">イベント 🎉</Text>
          <Text className="text-sm text-gray-500 mt-1">
            飲み会イベントを作成・管理
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* イベント作成ボタン */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Button
              title="新しいイベントを作成"
              icon={<Text className="text-xl">➕</Text>}
              onPress={() => setShowCreateModal(true)}
              fullWidth
              size="lg"
              variant="secondary"
            />
          </Animated.View>

          {/* イベント一覧 */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              すべてのイベント{isDummyDataEnabled && '（ダミーデータ）'}
            </Text>
            {isDummyDataEnabled && events.length > 0 ? (
              <View className="space-y-3">
                {events.map((event, index) => (
                  <Animated.View
                    key={event.id}
                    entering={FadeInDown.delay(250 + index * 30).duration(600)}
                  >
                    <TouchableOpacity>
                      <Card variant="elevated">
                        <View className="flex-row items-start">
                          <View className="bg-secondary-100 rounded-full w-14 h-14 items-center justify-center mr-4">
                            <Text className="text-3xl">🎉</Text>
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-2">
                              <Text className="text-lg font-bold text-gray-900 flex-1">
                                {event.title}
                              </Text>
                              <View
                                className={`px-3 py-1 rounded-full ml-2 ${
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
                            {event.description && (
                              <Text className="text-sm text-gray-600 mb-2">
                                {event.description}
                              </Text>
                            )}
                            <View className="flex-row items-center gap-4 mb-2">
                              <View className="flex-row items-center">
                                <Text className="text-xs text-gray-500">📅</Text>
                                <Text className="text-xs text-gray-500 ml-1">
                                  {dayjs(event.startedAt).format('M月D日 (ddd) HH:mm')}
                                </Text>
                              </View>
                              <View className="flex-row items-center">
                                <Text className="text-xs text-gray-500">
                                  {event.recordingRule === 'self'
                                    ? '✍️'
                                    : event.recordingRule === 'host_only'
                                    ? '👑'
                                    : '🤝'}
                                </Text>
                                <Text className="text-xs text-gray-500 ml-1">
                                  {event.recordingRule === 'self'
                                    ? '各自入力'
                                    : event.recordingRule === 'host_only'
                                    ? 'ホスト管理'
                                    : '同意制'}
                                </Text>
                              </View>
                            </View>
                            {event.hostId === user.id && (
                              <View className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 self-start">
                                <Text className="text-xs font-semibold text-amber-700">
                                  あなたがホスト
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <Text className="text-4xl mb-2">🎉</Text>
                  <Text className="text-gray-500 mb-4">
                    まだイベントがありません
                  </Text>
                  <Button
                    title="最初のイベントを作成"
                    size="sm"
                    variant="secondary"
                    onPress={() => setShowCreateModal(true)}
                  />
                </View>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
      </View>

      {/* イベント作成モーダル */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50">
          <View className="flex-1">
            {/* モーダルヘッダー */}
            <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setTitle('');
                  setDescription('');
                  setRecordingRule('self');
                }}
              >
                <Text className="text-primary-600 font-semibold text-base">
                  キャンセル
                </Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">
                イベントを作成
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView className="flex-1 px-6 py-6">
              {/* 基本情報 */}
              <Animated.View entering={FadeInDown.delay(100).duration(600)}>
                <Card variant="elevated" className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-4">
                    基本情報
                  </Text>
                  <Input
                    label="イベント名"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="例: サークルの新年会"
                    icon={<Text className="text-xl">🎉</Text>}
                  />
                  <Input
                    label="説明（任意）"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="イベントの詳細を入力..."
                    multiline
                    numberOfLines={3}
                    icon={<Text className="text-xl">📝</Text>}
                  />
                </Card>
              </Animated.View>

              {/* 記録ルール */}
              <Animated.View entering={FadeInDown.delay(200).duration(600)}>
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  記録ルール
                </Text>
                <View className="space-y-3">
                  {recordingRules.map((rule) => (
                    <TouchableOpacity
                      key={rule.id}
                      onPress={() => setRecordingRule(rule.id)}
                    >
                      <Card
                        variant="outlined"
                        className={
                          recordingRule === rule.id
                            ? 'border-2 border-secondary-500 bg-secondary-50'
                            : ''
                        }
                      >
                        <View className="flex-row items-start">
                          <Text className="text-3xl mr-3">{rule.emoji}</Text>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className="text-base font-semibold text-gray-900">
                                {rule.name}
                              </Text>
                              {recordingRule === rule.id && (
                                <Text className="text-2xl">✓</Text>
                              )}
                            </View>
                            <Text className="text-sm text-gray-600">
                              {rule.description}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            </ScrollView>

            {/* 作成ボタン */}
            <View className="px-6 py-4 bg-white border-t border-gray-200">
              <Button
                title="イベントを作成"
                onPress={handleCreateEvent}
                disabled={!title.trim()}
                fullWidth
                variant="secondary"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

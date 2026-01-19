import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card, Input } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { EventRecordingRule } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function CreateEventScreen() {
  const user = useUserStore((state) => state.user);
  const createEvent = useEventsStore((state) => state.createEvent);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordingRule, setRecordingRule] = useState<EventRecordingRule>('self');
  const [requiredApprovals, setRequiredApprovals] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    router.replace('/(tabs)');
    return null;
  }

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

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'イベント名を入力してください');
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { event, error } = await createEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      recordingRule,
      requiredApprovals:
        recordingRule === 'consensus'
          ? Math.max(1, parseInt(requiredApprovals) || 1)
          : 1,
      startedAt: new Date().toISOString(),
      hostId: user.id,
    });

    setIsLoading(false);

    if (error) {
      Alert.alert('エラー', error);
      return;
    }

    if (event) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('作成完了', 'イベントを作成しました', [
        {
          text: 'OK',
          onPress: () => router.push(`/(tabs)/events/${event.id}`),
        },
      ]);
    }
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* ヘッダー */}
          <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold text-base">
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">
              イベント作成
            </Text>
            <View style={{ width: 80 }} />
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
              <View className="space-y-3 mb-6">
                {recordingRules.map((rule) => (
                  <TouchableOpacity
                    key={rule.id}
                    onPress={() => {
                      setRecordingRule(rule.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
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

            {/* 承認設定（consensusモードの場合のみ表示） */}
            {recordingRule === 'consensus' && (
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <Card variant="elevated" className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 mb-4">
                    承認設定
                  </Text>
                  <Input
                    label="必要な承認数"
                    value={requiredApprovals}
                    onChangeText={setRequiredApprovals}
                    placeholder="1"
                    keyboardType="numeric"
                    icon={<Text className="text-xl">✅</Text>}
                  />
                  <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <Text className="text-xs text-blue-800 leading-5">
                      💡 記録が承認されるために必要な承認数を設定します。デフォルトは1人です。
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            )}
          </ScrollView>

          {/* 作成ボタン */}
          <View className="px-6 py-4 bg-white border-t border-gray-200">
            <Button
              title={isLoading ? '作成中...' : 'イベントを作成'}
              onPress={handleCreate}
              disabled={!title.trim() || isLoading}
              fullWidth
              variant="secondary"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

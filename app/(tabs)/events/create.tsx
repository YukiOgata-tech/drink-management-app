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
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Input, ResponsiveContainer, LoadingOverlay } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { EventRecordingRule } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function CreateEventScreen() {
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const createEvent = useEventsStore((state) => state.createEvent);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordingRule, setRecordingRule] = useState<EventRecordingRule>('self');
  const [requiredApprovals, setRequiredApprovals] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    router.replace('/(tabs)');
    return null;
  }

  // ゲストユーザーはイベント作成不可
  if (isGuest) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
        <View className="flex-1">
          <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Feather name="arrow-left" size={16} color="#0284c7" />
              <Text className="text-primary-600 font-semibold text-base ml-1">
                戻る
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">
              イベント作成
            </Text>
            <View style={{ width: 80 }} />
          </View>
          <View className="flex-1 items-center justify-center px-6">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Feather name="lock" size={40} color="#6b7280" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              ログインが必要です
            </Text>
            <Text className="text-gray-500 text-center mb-6">
              イベントを作成するには{'\n'}アカウントでログインしてください
            </Text>
            <Button
              title="ログインする"
              onPress={() => router.push('/(auth)/login')}
              variant="primary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const recordingRules: {
    id: EventRecordingRule;
    name: string;
    description: string;
    emoji: string;
    iconColor: string;
  }[] = [
    {
      id: 'self',
      name: '各自入力',
      description: '各参加者が自分の記録を自由に追加できます',
      emoji: '✏️',
      iconColor: '#0ea5e9',
    },
    {
      id: 'host_only',
      name: 'ホスト管理',
      description: 'ホストやマネージャーのみが記録を管理します',
      emoji: '👑',
      iconColor: '#f59e0b',
    },
    {
      id: 'consensus',
      name: '同意制',
      description: '記録には他の参加者の承認が必要です',
      emoji: '🤝',
      iconColor: '#8b5cf6',
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
      Alert.alert('エラー', `${error}\n\nユーザーID: ${user.id}`);
      console.error('Event creation error:', error, 'User ID:', user.id);
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
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <LoadingOverlay visible={isLoading} message="イベントを作成中..." />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* ヘッダー（グラデーション・エンタメ感） */}
          <LinearGradient
            colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 22 }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                <Text className="text-white/90 font-semibold text-base">キャンセル</Text>
              </TouchableOpacity>
              <View style={{ width: 60 }} />
            </View>
            <Text className="text-white text-2xl font-extrabold mt-3">🎉 イベントを作成</Text>
            <Text className="text-white/80 text-sm mt-1">みんなで飲み会を盛り上げよう！</Text>
          </LinearGradient>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ alignItems: isMd ? 'center' : undefined }}
          >
            <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-2xl' : ''}`}>
            {/* 基本情報 */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                基本情報
              </Text>
              <Input
                label="イベント名"
                value={title}
                onChangeText={setTitle}
                placeholder="例: 新年会 🎍"
                icon={<Feather name="tag" size={20} color="#9ca3af" />}
              />
              <Input
                label="説明（任意）"
                value={description}
                onChangeText={setDescription}
                placeholder="どんな会？ ひとことメモ"
                multiline
                numberOfLines={3}
                icon={<Feather name="align-left" size={20} color="#9ca3af" />}
              />
            </Animated.View>

            {/* 記録ルール */}
            <Animated.View entering={FadeInDown.delay(200).duration(600)}>
              <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                記録ルール
              </Text>
              <View className="gap-y-3 mb-6">
                {recordingRules.map((rule) => {
                  const selected = recordingRule === rule.id;
                  return (
                    <TouchableOpacity
                      key={rule.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        setRecordingRule(rule.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Card
                        variant="outlined"
                        style={
                          selected
                            ? { borderColor: rule.iconColor, borderWidth: 2 }
                            : undefined
                        }
                      >
                        <View className="flex-row items-center">
                          <View
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 24,
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: 12,
                              backgroundColor: rule.iconColor + (isDark ? '33' : '22'),
                            }}
                          >
                            <Text style={{ fontSize: 24 }}>{rule.emoji}</Text>
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center justify-between mb-0.5">
                              <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {rule.name}
                              </Text>
                              {selected && (
                                <Feather name="check-circle" size={22} color={rule.iconColor} />
                              )}
                            </View>
                            <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              {rule.description}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {/* 承認設定（consensusモードの場合のみ表示） */}
            {recordingRule === 'consensus' && (
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <Text className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  承認設定
                </Text>
                <Input
                  label="必要な承認数"
                  value={requiredApprovals}
                  onChangeText={setRequiredApprovals}
                  placeholder="1"
                  keyboardType="numeric"
                  icon={<Feather name="check-circle" size={20} color="#9ca3af" />}
                  helperText="記録が確定するために必要な承認人数（既定: 1人）"
                />
              </Animated.View>
            )}
            </ResponsiveContainer>
          </ScrollView>

          {/* 作成ボタン */}
          <View className={`px-6 py-4 pb-24 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${isMd ? 'items-center' : ''}`}>
            <ResponsiveContainer className={isMd ? 'max-w-2xl' : ''}>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!title.trim() || isLoading}
                activeOpacity={0.85}
                style={{ opacity: !title.trim() || isLoading ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={['#0ea5e9', '#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Feather name="plus" size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">
                    {isLoading ? '作成中...' : 'イベントを作成'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ResponsiveContainer>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

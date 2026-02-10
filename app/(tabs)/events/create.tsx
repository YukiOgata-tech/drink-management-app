import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer } from '@/components/ui';
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

  const recordingRules: Array<{
    id: EventRecordingRule;
    name: string;
    description: string;
    icon: keyof typeof Feather.glyphMap;
    iconColor: string;
  }> = [
    {
      id: 'self',
      name: 'Self（各自入力）',
      description: '各参加者が自分の記録を自由に追加できます',
      icon: 'edit-3',
      iconColor: '#0ea5e9',
    },
    {
      id: 'host_only',
      name: 'Host Only（ホスト管理）',
      description: 'ホストやマネージャーのみが記録を管理します',
      icon: 'shield',
      iconColor: '#f59e0b',
    },
    {
      id: 'consensus',
      name: 'Consensus（同意制）',
      description: '記録には他の参加者の承認が必要です',
      icon: 'users',
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* ヘッダー */}
          <View className={`px-6 py-4 border-b flex-row items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold text-base">
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              イベント作成
            </Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ alignItems: isMd ? 'center' : undefined }}
          >
            <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-2xl' : ''}`}>
            {/* 基本情報 */}
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <Text style={styles.sectionHeader}>基本情報</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>イベント名</Text>
                  <TextInput
                    style={styles.inputField}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="例: 新年会"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={styles.separator} />
                <View style={[styles.inputRow, styles.inputRowMultiline]}>
                  <Text style={styles.inputLabel}>説明</Text>
                  <TextInput
                    style={[styles.inputField, styles.inputFieldMultiline]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="任意"
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
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
                        <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-3">
                          <Feather name={rule.icon} size={24} color={rule.iconColor} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between mb-1">
                            <Text className="text-base font-semibold text-gray-900">
                              {rule.name}
                            </Text>
                            {recordingRule === rule.id && (
                              <Feather name="check-circle" size={24} color="#f97316" />
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
                <Text style={styles.sectionHeader}>承認設定</Text>
                <View style={styles.inputGroup}>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>必要な承認数</Text>
                    <TextInput
                      style={[styles.inputField, { textAlign: 'right' }]}
                      value={requiredApprovals}
                      onChangeText={setRequiredApprovals}
                      placeholder="1"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <Text style={styles.sectionFooter}>
                  記録が承認されるために必要な承認数を設定します。デフォルトは1人です。
                </Text>
              </Animated.View>
            )}
            </ResponsiveContainer>
          </ScrollView>

          {/* 作成ボタン */}
          <View className={`px-6 py-4 pb-24 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${isMd ? 'items-center' : ''}`}>
            <ResponsiveContainer className={isMd ? 'max-w-2xl' : ''}>
              <Button
                title={isLoading ? '作成中...' : 'イベントを作成'}
                onPress={handleCreate}
                disabled={!title.trim() || isLoading}
                fullWidth
                variant="secondary"
              />
            </ResponsiveContainer>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionFooter: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
    lineHeight: 18,
  },
  inputGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  inputRowMultiline: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 17,
    color: '#111827',
    width: 100,
  },
  inputField: {
    flex: 1,
    fontSize: 17,
    color: '#111827',
    padding: 0,
  },
  inputFieldMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e7eb',
    marginLeft: 16,
  },
});

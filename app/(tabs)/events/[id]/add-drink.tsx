import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { DefaultDrink } from '@/types';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Input, ResponsiveContainer } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useDrinksStore } from '@/stores/drinks';
import { useSyncStore } from '@/stores/sync';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { initialDrinkLogStatus, persistEventDrinkLog } from '@/lib/event-recording';
import { hasRecordedToday } from '@/lib/personal-logs-api';
import { XP_VALUES } from '@/lib/xp';
import { SyncStatusBanner } from '@/components/SyncStatusBanner';
import { useBarcodeScanStore } from '@/stores/barcodeScan';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function AddDrinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pendingBarcodeProduct = useBarcodeScanStore((s) => s.pendingProduct);
  const consumePendingProduct = useBarcodeScanStore((s) => s.consumePendingProduct);
  const user = useUserStore((state) => state.user);
  const isGuest = useUserStore((state) => state.isGuest);
  const addXP = useUserStore((state) => state.addXP);
  const event = useEventsStore((state) => state.getEventById(id));
  const members = useEventsStore((state) => state.getEventMembers(id));
  const defaultDrinks = useDrinksStore((state) => state.defaultDrinks);
  const isOnline = useSyncStore((state) => state.isOnline);
  const refreshPendingCounts = useSyncStore((state) => state.refreshPendingCounts);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrink, setSelectedDrink] = useState<any>(null);
  const [count, setCount] = useState(1);
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedUserId(user.id);
    }
  }, [user]);

  // バーコードスキャン結果をストアから受け取って選択
  useEffect(() => {
    if (!pendingBarcodeProduct) return;
    const product = consumePendingProduct();
    if (!product) return;

    // バーコード商品をDefaultDrink形式に変換して選択
    const drinkInfo: DefaultDrink = {
      id: product.id,
      name: product.name,
      category: product.category,
      ml: product.ml,
      abv: product.abv,
      pureAlcoholG: product.pureAlcoholG,
      emoji: product.emoji,
    };
    setSelectedDrink(drinkInfo);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pendingBarcodeProduct, consumePendingProduct]);

  if (!user || !event) {
    router.back();
    return null;
  }

  const canManage =
    event.recordingRule === 'host_only' &&
    members.some(
      (m) =>
        m.userId === user.id && (m.role === 'host' || m.role === 'manager')
    );

  const categories = [
    { id: 'beer', name: 'ビール', emoji: '🍺' },
    { id: 'highball', name: 'ハイボール', emoji: '🥃' },
    { id: 'chuhai_sour', name: 'サワー', emoji: '🍋' },
    { id: 'sake', name: '日本酒', emoji: '🍶' },
    { id: 'wine', name: 'ワイン', emoji: '🍷' },
    { id: 'cocktail', name: 'カクテル', emoji: '🍹' },
    { id: 'soft_drink', name: 'ソフトドリンク', emoji: '🥤' },
    { id: 'other', name: 'その他', emoji: '🍻' },
  ];

  const filteredDrinks = defaultDrinks.filter((drink) => {
    const matchesCategory =
      !selectedCategory || drink.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      drink.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmit = async () => {
    if (!selectedDrink) {
      Alert.alert('エラー', 'ドリンクを選択してください');
      return;
    }

    if (!selectedUserId) {
      Alert.alert('エラー', 'ユーザーを選択してください');
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const drinkLogData = {
      userId: selectedUserId,
      eventId: id,
      drinkId: selectedDrink.id,
      drinkName: selectedDrink.name,
      ml: selectedDrink.ml,
      abv: selectedDrink.abv,
      pureAlcoholG: selectedDrink.pureAlcoholG * count,
      count,
      memo: memo.trim() || undefined,
      recordedById: user.id,
      status: initialDrinkLogStatus(event.recordingRule),
    };

    // 永続化（オフライン/オンライン/フォールバックを集約）
    const { outcome, error } = await persistEventDrinkLog(drinkLogData, { isOnline });
    setIsSubmitting(false);

    // 失敗（キュー保存も不可）
    if (!outcome) {
      Alert.alert('エラー', error?.message || '記録の追加に失敗しました');
      return;
    }

    // オフライン保存 / サーバー失敗時のフォールバック保存
    if (outcome === 'offline' || outcome === 'offline_fallback') {
      await refreshPendingCounts();
      Haptics.notificationAsync(
        outcome === 'offline'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      Alert.alert(
        outcome === 'offline' ? 'オフライン保存' : '一時保存',
        outcome === 'offline'
          ? '記録をローカルに保存しました。オンラインに戻った時に自動的に同期されます。'
          : 'サーバーに接続できませんでした。記録をローカルに保存しました。後で自動的に同期されます。',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      return;
    }

    // XP付与（自分の記録の場合のみ、ゲストは除外）
    let leveledUp = false;
    let newLevel: number | undefined;
    let debtPaid = 0;

    if (!isGuest && user && selectedUserId === user.id) {
      try {
        // 当日初回記録かチェック
        const { hasRecorded } = await hasRecordedToday(user.id);
        const isFirstOfDay = !hasRecorded;
        // 純アルコール量に応じてXPを付与（1g = 1 XP）
        const baseXP = Math.floor(selectedDrink.pureAlcoholG * count);
        const xpAmount = isFirstOfDay
          ? baseXP + XP_VALUES.DAILY_BONUS
          : baseXP;

        const xpResult = await addXP(xpAmount, 'drink_log');
        leveledUp = xpResult.leveledUp;
        newLevel = xpResult.newLevel;
        debtPaid = xpResult.debtPaid;
      } catch (xpError) {
        console.error('XP付与エラー:', xpError);
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // フィードバックメッセージの組み立て
    let message = event.recordingRule === 'consensus'
      ? '記録を追加しました。他の参加者の承認をお待ちください。'
      : '記録を追加しました';

    if (leveledUp && newLevel) {
      Alert.alert(
        'レベルアップ！',
        `${message}\n\nレベル ${newLevel} になりました！`,
        [{ text: 'やったー！', onPress: () => router.back() }]
      );
    } else if (debtPaid > 0) {
      Alert.alert(
        '記録完了',
        `${message}\n\n借金XP ${debtPaid} を返済しました`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        '記録完了',
        message,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* オフラインバナー */}
          <SyncStatusBanner />

          {/* ヘッダー */}
          <View className={`px-6 py-4 border-b flex-row items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold text-base">
                キャンセル
              </Text>
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              飲酒記録を追加
            </Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: 100,
              paddingHorizontal: 24,
              paddingVertical: 24,
              alignItems: isMd ? 'center' : undefined,
            }}
          >
            <ResponsiveContainer className={isMd ? 'max-w-2xl w-full' : 'w-full'}>
            {/* ユーザー選択（host_onlyモードの場合のみ） */}
            {canManage && (
              <Animated.View
                entering={FadeInDown.delay(100).duration(600)}
                className="mb-6"
              >
                <Text className="text-lg font-bold text-gray-900 mb-3">
                  誰の記録ですか？
                </Text>
                <Card variant="elevated">
                  <View className="gap-y-2">
                    {members.map((member) => (
                      <TouchableOpacity
                        key={member.userId}
                        onPress={() => {
                          setSelectedUserId(member.userId);
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                        }}
                        className={`p-3 rounded-xl ${
                          selectedUserId === member.userId
                            ? 'bg-primary-100 border-2 border-primary-500'
                            : 'bg-gray-50'
                        }`}
                      >
                        <Text
                          className={`text-base font-semibold ${
                            selectedUserId === member.userId
                              ? 'text-primary-700'
                              : 'text-gray-900'
                          }`}
                        >
                          {member.userId === user.id ? '自分' : (member.displayName || '名無し')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>
              </Animated.View>
            )}

            {/* バーコードスキャン */}
            <Animated.View
              entering={FadeInDown.delay(150).duration(600)}
              className="mb-4"
            >
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/drinks/barcode-scan')}
                className="rounded-xl py-4 px-5 flex-row items-center"
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#f97316',
                  shadowColor: '#ea580c',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  <Feather name="maximize" size={24} color="#ffffff" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-base">
                    バーコードで追加
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)' }} className="text-sm mt-0.5">
                    缶チューハイなどをスキャンして記録
                  </Text>
                </View>
                <Feather name="chevron-right" size={24} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>

            {/* 検索バー */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(600)}
              className="mb-4"
            >
              <View className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                <TextInput
                  placeholder="ドリンクを検索..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="text-base"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </Animated.View>

            {/* カテゴリ選択 */}
            <Animated.View
              entering={FadeInDown.delay(250).duration(600)}
              className="mb-6"
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl ${
                      !selectedCategory ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        !selectedCategory ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      すべて
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl flex-row items-center ${
                        selectedCategory === cat.id
                          ? 'bg-primary-500'
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className="mr-1">{cat.emoji}</Text>
                      <Text
                        className={`font-semibold ${
                          selectedCategory === cat.id
                            ? 'text-white'
                            : 'text-gray-700'
                        }`}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Animated.View>

            {/* ドリンクリスト */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)}>
              <Text className="text-lg font-bold text-gray-900 mb-3">
                ドリンクを選択
              </Text>
              <View className="gap-y-2 mb-6">
                {filteredDrinks.map((drink) => (
                  <TouchableOpacity
                    key={drink.id}
                    onPress={() => {
                      setSelectedDrink(drink);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Card
                      variant="outlined"
                      className={
                        selectedDrink?.id === drink.id
                          ? 'border-2 border-primary-500 bg-primary-50'
                          : ''
                      }
                    >
                      <View className="flex-row items-center">
                        <Text className="text-3xl mr-3">{drink.emoji}</Text>
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-gray-900">
                            {drink.name}
                          </Text>
                          <Text className="text-sm text-gray-500">
                            {drink.ml}ml • {drink.abv}% •{' '}
                            {drink.pureAlcoholG.toFixed(1)}g
                          </Text>
                        </View>
                        {selectedDrink?.id === drink.id && (
                          <Feather name="check-circle" size={22} color="#0ea5e9" />
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* 杯数とメモ */}
            {selectedDrink && (
              <Animated.View entering={FadeIn.duration(300)} className="mb-6">
                <Card variant="elevated">
                  <Text className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    詳細
                  </Text>

                  {/* 杯数 */}
                  <View className="mb-4">
                    <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      杯数
                    </Text>
                    <View className="flex-row items-center justify-center gap-4">
                      <TouchableOpacity
                        onPress={() => setCount(Math.max(1, count - 1))}
                        className={`w-12 h-12 rounded-full items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                      >
                        <Text className={`text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          −
                        </Text>
                      </TouchableOpacity>
                      <Text className={`text-3xl font-bold w-16 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {count}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCount(count + 1)}
                        className="bg-primary-500 w-12 h-12 rounded-full items-center justify-center"
                      >
                        <Text className="text-xl font-bold text-white">＋</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className={`text-center text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      純アルコール量:{' '}
                      {(selectedDrink.pureAlcoholG * count).toFixed(1)}g
                    </Text>
                  </View>

                  {/* メモ */}
                  <Input
                    label="メモ（任意）"
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="例: めっちゃ美味しい！"
                    multiline
                    numberOfLines={2}
                    icon={<Feather name="message-circle" size={20} color="#6b7280" />}
                  />
                </Card>
              </Animated.View>
            )}
            </ResponsiveContainer>
          </ScrollView>

          {/* 追加ボタン */}
          {selectedDrink && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="px-6 py-4 pb-24 bg-white border-t border-gray-200"
            >
              <Button
                title={isSubmitting ? '追加中...' : '記録を追加'}
                onPress={handleSubmit}
                disabled={isSubmitting}
                fullWidth
                variant="primary"
              />
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
import { Button, Card, Input } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useEventsStore } from '@/stores/events';
import { useDrinksStore } from '@/stores/drinks';
import * as DrinkLogsAPI from '@/lib/drink-logs';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function AddDrinkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const event = useEventsStore((state) => state.getEventById(id));
  const members = useEventsStore((state) => state.getEventMembers(id));
  const defaultDrinks = useDrinksStore((state) => state.defaultDrinks);

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

    const { drinkLog, error } = await DrinkLogsAPI.createDrinkLog({
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
      status: event.recordingRule === 'consensus' ? 'pending' : 'approved',
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('エラー', error.message || '記録の追加に失敗しました');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '記録完了',
      event.recordingRule === 'consensus'
        ? '記録を追加しました。他の参加者の承認をお待ちください。'
        : '記録を追加しました',
      [{ text: 'OK', onPress: () => router.back() }]
    );
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
              飲酒記録を追加
            </Text>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView className="flex-1 px-6 py-6">
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
                  <View className="space-y-2">
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
                          {member.userId === user.id ? '自分' : 'ユーザー'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Card>
              </Animated.View>
            )}

            {/* 検索バー */}
            <Animated.View
              entering={FadeInDown.delay(150).duration(600)}
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
              entering={FadeInDown.delay(200).duration(600)}
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
            <Animated.View entering={FadeInDown.delay(250).duration(600)}>
              <Text className="text-lg font-bold text-gray-900 mb-3">
                ドリンクを選択
              </Text>
              <View className="space-y-2 mb-6">
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
                          <Text className="text-2xl">✓</Text>
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
                  <Text className="text-lg font-bold text-gray-900 mb-4">
                    詳細
                  </Text>

                  {/* 杯数 */}
                  <View className="mb-4">
                    <Text className="text-sm font-semibold text-gray-700 mb-2">
                      杯数
                    </Text>
                    <View className="flex-row items-center justify-center gap-4">
                      <TouchableOpacity
                        onPress={() => setCount(Math.max(1, count - 1))}
                        className="bg-gray-200 w-12 h-12 rounded-full items-center justify-center"
                      >
                        <Text className="text-xl font-bold text-gray-700">
                          −
                        </Text>
                      </TouchableOpacity>
                      <Text className="text-3xl font-bold text-gray-900 w-16 text-center">
                        {count}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCount(count + 1)}
                        className="bg-primary-500 w-12 h-12 rounded-full items-center justify-center"
                      >
                        <Text className="text-xl font-bold text-white">＋</Text>
                      </TouchableOpacity>
                    </View>
                    <Text className="text-center text-sm text-gray-500 mt-2">
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
                    icon={<Text className="text-xl">💬</Text>}
                  />
                </Card>
              </Animated.View>
            )}
          </ScrollView>

          {/* 追加ボタン */}
          {selectedDrink && (
            <Animated.View
              entering={FadeIn.duration(300)}
              className="px-6 py-4 bg-white border-t border-gray-200"
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

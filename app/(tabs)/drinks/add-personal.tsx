import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useProductsStore } from '@/stores/products';
import { useCustomDrinksStore } from '@/stores/customDrinks';
import { useUserStore } from '@/stores/user';
import { DrinkCategory, Product, CustomDrink } from '@/types';
import { calculatePureAlcohol } from '@/lib/products';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CATEGORY_OPTIONS: { value: DrinkCategory; label: string; emoji: string }[] = [
  { value: 'beer', label: 'ビール', emoji: '🍺' },
  { value: 'highball', label: 'ハイボール', emoji: '🥃' },
  { value: 'chuhai_sour', label: 'チューハイ', emoji: '🍋' },
  { value: 'shochu', label: '焼酎', emoji: '🥃' },
  { value: 'sake', label: '日本酒', emoji: '🍶' },
  { value: 'wine', label: 'ワイン', emoji: '🍷' },
  { value: 'cocktail', label: 'カクテル', emoji: '🍹' },
  { value: 'other', label: 'その他', emoji: '🍸' },
];

export default function AddPersonalDrinkScreen() {
  const user = useUserStore((state) => state.user);
  const addLog = usePersonalLogsStore((state) => state.addLog);

  const products = useProductsStore((state) => state.products);
  const isLoadingProducts = useProductsStore((state) => state.isLoading);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);

  const customDrinks = useCustomDrinksStore((state) => state.drinks);
  const loadCustomDrinks = useCustomDrinksStore((state) => state.loadDrinks);

  const [selectedCategory, setSelectedCategory] = useState<DrinkCategory>('beer');
  const [selectedDrink, setSelectedDrink] = useState<(Product | CustomDrink) | null>(null);
  const [isCustomDrink, setIsCustomDrink] = useState(false);
  const [count, setCount] = useState('1');
  const [memo, setMemo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
    loadCustomDrinks();
  }, []);

  // カテゴリー別にフィルタリング
  const filteredProducts = products.filter((p) => p.category === selectedCategory);
  const filteredCustomDrinks = customDrinks.filter((d) => d.category === selectedCategory);

  // 検索クエリでフィルタリング
  const searchFilteredProducts = filteredProducts.filter((p) =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );
  const searchFilteredCustomDrinks = filteredCustomDrinks.filter((d) =>
    searchQuery ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const allDrinks = [
    ...searchFilteredCustomDrinks.map((d) => ({ ...d, isCustom: true })),
    ...searchFilteredProducts.map((p) => ({ ...p, isCustom: false })),
  ];

  const handleSave = () => {
    if (!selectedDrink) {
      Alert.alert('エラー', '飲み物を選択してください');
      return;
    }

    const countValue = parseInt(count);
    if (!count || isNaN(countValue) || countValue <= 0) {
      Alert.alert('エラー', '正しい杯数を入力してください');
      return;
    }

    const pureAlcoholG = calculatePureAlcohol(selectedDrink.ml, selectedDrink.abv) * countValue;

    const log = {
      id: `personal_${Date.now()}`,
      userId: user?.id || 'guest',
      drinkId: selectedDrink.id,
      drinkName: selectedDrink.name,
      drinkCategory: selectedDrink.category,
      ml: selectedDrink.ml,
      abv: selectedDrink.abv,
      pureAlcoholG,
      count: countValue,
      memo: memo.trim() || undefined,
      recordedAt: new Date().toISOString(),
      isCustomDrink,
    };

    addLog(log);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('記録完了', '飲酒記録を保存しました', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

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
          <Text className="text-2xl font-bold text-gray-900">
            個人記録を追加
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* カテゴリー選択 */}
          <Animated.View entering={FadeInDown.delay(50).duration(600)}>
            <Card variant="elevated" className="mb-4">
              <Text className="text-base font-bold text-gray-900 mb-3">
                カテゴリー
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {CATEGORY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        setSelectedCategory(option.value);
                        setSelectedDrink(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className={`px-4 py-2 rounded-lg ${
                        selectedCategory === option.value
                          ? 'bg-primary-500'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selectedCategory === option.value
                            ? 'text-white font-semibold'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.emoji} {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </Animated.View>

          {/* 検索 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-4">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="商品名で検索..."
                className="text-base text-gray-900 py-2"
                placeholderTextColor="#9CA3AF"
              />
            </Card>
          </Animated.View>

          {/* 飲み物リスト */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-gray-900">
                飲み物を選択
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/drinks/add-custom-drink')}
                className="bg-primary-50 px-3 py-1 rounded-lg"
              >
                <Text className="text-primary-600 font-semibold text-sm">
                  + カスタム追加
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingProducts ? (
              <Card variant="elevated" className="items-center py-8">
                <ActivityIndicator size="large" color="#0ea5e9" />
                <Text className="text-gray-500 mt-2">読み込み中...</Text>
              </Card>
            ) : allDrinks.length === 0 ? (
              <Card variant="elevated" className="items-center py-8">
                <Text className="text-4xl mb-2">🔍</Text>
                <Text className="text-gray-500">該当する商品がありません</Text>
              </Card>
            ) : (
              <View className="space-y-2">
                {allDrinks.map((drink) => (
                  <TouchableOpacity
                    key={drink.id}
                    onPress={() => {
                      setSelectedDrink(drink);
                      setIsCustomDrink('isCustom' in drink && drink.isCustom);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Card
                      variant={selectedDrink?.id === drink.id ? 'elevated' : 'outlined'}
                      className={
                        selectedDrink?.id === drink.id ? 'bg-primary-50 border-primary-500' : ''
                      }
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{drink.emoji || '🍺'}</Text>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-base font-semibold text-gray-900">
                              {drink.name}
                            </Text>
                            {'isCustom' in drink && drink.isCustom && (
                              <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                                <Text className="text-xs text-amber-700 font-semibold">
                                  カスタム
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-sm text-gray-500 mt-1">
                            {drink.ml}ml • {drink.abv}%
                            {drink.brand && ` • ${drink.brand}`}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>

          {/* 選択された飲み物の情報 */}
          {selectedDrink && (
            <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mt-6">
              <Card variant="elevated" className="bg-primary-50">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  記録内容
                </Text>

                <View className="bg-white rounded-xl p-4 mb-4">
                  <Text className="text-sm text-gray-500 mb-1">選択した飲み物</Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {selectedDrink.name}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    {selectedDrink.ml}ml • アルコール度数 {selectedDrink.abv}%
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    杯数
                  </Text>
                  <TextInput
                    value={count}
                    onChangeText={setCount}
                    keyboardType="numeric"
                    placeholder="1"
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">
                    メモ（任意）
                  </Text>
                  <TextInput
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="例: 夕食と一緒に"
                    multiline
                    numberOfLines={3}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                  />
                </View>

                {parseInt(count) > 0 && (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <Text className="text-sm text-amber-800">
                      純アルコール量: 約{' '}
                      <Text className="font-bold">
                        {(
                          calculatePureAlcohol(selectedDrink.ml, selectedDrink.abv) *
                          parseInt(count)
                        ).toFixed(1)}
                        g
                      </Text>
                    </Text>
                  </View>
                )}

                <Button title="記録を保存" onPress={handleSave} fullWidth className="mt-4" />
              </Card>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

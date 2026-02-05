import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useProductsStore } from '@/stores/products';
import { useCustomDrinksStore } from '@/stores/customDrinks';
import { useDrinksStore } from '@/stores/drinks';
import { useUserStore } from '@/stores/user';
import { DrinkCategory, Product, CustomDrink, DefaultDrink, PersonalDrinkLog } from '@/types';
import { calculatePureAlcohol } from '@/lib/products';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// よく使う人気ドリンクのID（表示順）
const POPULAR_DRINK_IDS = [
  'beer_draft_medium',    // 生ビール(中)
  'highball_regular',     // ハイボール
  'chuhai_lemon',         // レモンサワー
  'sake_1go',             // 日本酒(1合)
  'wine_glass_red',       // 赤ワイン
  'cocktail_cassis_orange', // カシスオレンジ
];

// 履歴から作成されるドリンク情報
type RecentDrinkInfo = {
  id: string;
  name: string;
  category: DrinkCategory;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  emoji: string;
  isCustom: boolean;
};

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

type SelectedDrinkInfo = {
  drink: Product | CustomDrink | DefaultDrink;
  isCustom: boolean;
};

// カテゴリ別の絵文字マッピング
const getCategoryEmoji = (category: DrinkCategory): string => {
  const emojiMap: Record<DrinkCategory, string> = {
    beer: '🍺',
    highball: '🥃',
    chuhai_sour: '🍋',
    shochu: '🥃',
    sake: '🍶',
    wine: '🍷',
    fruit_liquor: '🍑',
    shot_straight: '🥃',
    cocktail: '🍹',
    soft_drink: '🥤',
    other: '🍸',
  };
  return emojiMap[category] || '🍺';
};

export default function AddPersonalDrinkScreen() {
  const user = useUserStore((state) => state.user);
  const addLog = usePersonalLogsStore((state) => state.addLog);
  const personalLogs = usePersonalLogsStore((state) => state.logs);

  const products = useProductsStore((state) => state.products);
  const isLoadingProducts = useProductsStore((state) => state.isLoading);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);

  const customDrinks = useCustomDrinksStore((state) => state.drinks);
  const loadCustomDrinks = useCustomDrinksStore((state) => state.loadDrinks);

  const defaultDrinks = useDrinksStore((state) => state.defaultDrinks);

  const [selectedDrink, setSelectedDrink] = useState<SelectedDrinkInfo | null>(null);
  const [count, setCount] = useState(1);
  const [memo, setMemo] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DrinkCategory>('beer');

  useEffect(() => {
    fetchProducts();
    loadCustomDrinks();
  }, []);

  // 最近記録したドリンク（最新3件、重複除外）
  const recentDrinks: RecentDrinkInfo[] = React.useMemo(() => {
    const seen = new Set<string>();
    const result: RecentDrinkInfo[] = [];

    // 新しい順にソート
    const sortedLogs = [...personalLogs].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );

    for (const log of sortedLogs) {
      if (result.length >= 3) break;

      // drinkIdまたはdrinkNameで重複チェック
      const key = log.drinkId || log.drinkName;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        id: log.drinkId || `recent_${log.id}`,
        name: log.drinkName,
        category: log.drinkCategory,
        ml: log.ml,
        abv: log.abv,
        pureAlcoholG: log.pureAlcoholG / log.count, // 1杯分に換算
        emoji: getCategoryEmoji(log.drinkCategory),
        isCustom: log.isCustomDrink,
      });
    }

    return result;
  }, [personalLogs]);

  // 人気ドリンクを取得
  const popularDrinks = POPULAR_DRINK_IDS
    .map((id) => defaultDrinks.find((d) => d.id === id))
    .filter((d): d is DefaultDrink => d !== undefined);

  // カテゴリー別にフィルタリング
  const filteredProducts = products.filter((p) => p.category === selectedCategory);
  const filteredCustomDrinks = customDrinks.filter((d) => d.category === selectedCategory);
  const filteredDefaultDrinks = defaultDrinks.filter((d) => d.category === selectedCategory);

  // 検索クエリでフィルタリング
  const searchFilteredProducts = filteredProducts.filter((p) =>
    searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );
  const searchFilteredCustomDrinks = filteredCustomDrinks.filter((d) =>
    searchQuery ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );
  const searchFilteredDefaultDrinks = filteredDefaultDrinks.filter((d) =>
    searchQuery ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const allSearchDrinks = [
    ...searchFilteredCustomDrinks.map((d) => ({ drink: d, isCustom: true })),
    ...searchFilteredDefaultDrinks.map((d) => ({ drink: d, isCustom: false })),
    ...searchFilteredProducts.map((p) => ({ drink: p, isCustom: false })),
  ];

  const handleSelectDrink = (drink: Product | CustomDrink | DefaultDrink, isCustom: boolean) => {
    setSelectedDrink({ drink, isCustom });
    setShowSearch(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = async () => {
    if (!selectedDrink) {
      Alert.alert('エラー', '飲み物を選択してください');
      return;
    }

    if (count <= 0) {
      Alert.alert('エラー', '正しい杯数を入力してください');
      return;
    }

    const pureAlcoholG = calculatePureAlcohol(selectedDrink.drink.ml, selectedDrink.drink.abv) * count;

    const log = {
      id: `personal_${Date.now()}`,
      userId: user?.id || 'guest',
      drinkId: selectedDrink.drink.id,
      drinkName: selectedDrink.drink.name,
      drinkCategory: selectedDrink.drink.category,
      ml: selectedDrink.drink.ml,
      abv: selectedDrink.drink.abv,
      pureAlcoholG,
      count,
      memo: memo.trim() || undefined,
      recordedAt: new Date().toISOString(),
      isCustomDrink: selectedDrink.isCustom,
    };

    const result = await addLog(log);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // XP関連のフィードバック
    if (result.leveledUp && result.newLevel) {
      Alert.alert(
        '🎉 レベルアップ！',
        `レベル ${result.newLevel} になりました！`,
        [{ text: 'やったー！', onPress: () => router.back() }]
      );
    } else if (result.debtPaid > 0) {
      Alert.alert(
        '✓ 記録を保存しました',
        `借金XP ${result.debtPaid} を返済しました`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      router.back();
    }
  };

  const handleQuickSelect = (drink: DefaultDrink) => {
    setSelectedDrink({ drink, isCustom: false });
    setCount(1);
    setMemo('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRecentSelect = (recent: RecentDrinkInfo) => {
    // RecentDrinkInfoをSelectedDrinkInfo形式に変換
    const drinkInfo: DefaultDrink = {
      id: recent.id,
      name: recent.name,
      category: recent.category,
      ml: recent.ml,
      abv: recent.abv,
      pureAlcoholG: recent.pureAlcoholG,
      emoji: recent.emoji,
    };
    setSelectedDrink({ drink: drinkInfo, isCustom: recent.isCustom });
    setCount(1);
    setMemo('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* ヘッダー */}
        <View className="px-6 py-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-primary-600 font-semibold text-base">
                ← 戻る
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-900">個人記録を追加</Text>
            <View style={{ width: 50 }} />
          </View>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* 最近記録したドリンク */}
          {recentDrinks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(400)} className="px-6 pt-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">
                最近記録したドリンク
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {recentDrinks.map((drink) => (
                  <TouchableOpacity
                    key={`recent_${drink.id}_${drink.name}`}
                    onPress={() => handleRecentSelect(drink)}
                    className={`border rounded-xl px-4 py-3 flex-row items-center ${
                      selectedDrink?.drink.id === drink.id
                        ? 'bg-primary-50 border-primary-500'
                        : 'bg-white border-gray-200'
                    }`}
                    style={{ minWidth: '45%' }}
                    activeOpacity={0.7}
                  >
                    <Text className="text-2xl mr-2">{drink.emoji}</Text>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                          {drink.name}
                        </Text>
                        {drink.isCustom && (
                          <View className="ml-1 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Text className="text-xs text-amber-700">C</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-500">
                        {drink.pureAlcoholG.toFixed(1)}g
                      </Text>
                    </View>
                    {selectedDrink?.drink.id === drink.id && (
                      <Text className="text-primary-500 text-lg">✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* クイック選択: 人気ドリンク */}
          <Animated.View entering={FadeInDown.delay(recentDrinks.length > 0 ? 100 : 50).duration(400)} className="px-6 pt-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              よく使うドリンク
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {popularDrinks.map((drink) => (
                <TouchableOpacity
                  key={drink.id}
                  onPress={() => handleQuickSelect(drink)}
                  className={`border rounded-xl px-4 py-3 flex-row items-center ${
                    selectedDrink?.drink.id === drink.id
                      ? 'bg-primary-50 border-primary-500'
                      : 'bg-white border-gray-200'
                  }`}
                  style={{ minWidth: '45%' }}
                  activeOpacity={0.7}
                >
                  <Text className="text-2xl mr-2">{drink.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                      {drink.name}
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {drink.pureAlcoholG.toFixed(1)}g
                    </Text>
                  </View>
                  {selectedDrink?.drink.id === drink.id && (
                    <Text className="text-primary-500 text-lg">✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* 選択して記録 */}
          <Animated.View entering={FadeInDown.delay(recentDrinks.length > 0 ? 150 : 100).duration(400)} className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold text-gray-900">
                選んで記録
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/drinks/add-custom-drink')}
                className="bg-primary-50 px-3 py-1 rounded-lg"
              >
                <Text className="text-primary-600 font-semibold text-sm">
                  + カスタム追加
                </Text>
              </TouchableOpacity>
            </View>

            {/* 選択中のドリンク or 選択ボタン */}
            {selectedDrink ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <Card variant="elevated" className="bg-primary-50 border-primary-200">
                  <View className="flex-row items-center mb-4">
                    <Text className="text-3xl mr-3">{selectedDrink.drink.emoji || '🍺'}</Text>
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="text-lg font-bold text-gray-900">
                          {selectedDrink.drink.name}
                        </Text>
                        {selectedDrink.isCustom && (
                          <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                            <Text className="text-xs text-amber-700 font-semibold">
                              カスタム
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-sm text-gray-600">
                        {selectedDrink.drink.ml}ml • {selectedDrink.drink.abv}%
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowSearch(true)}
                      className="bg-white px-3 py-2 rounded-lg border border-gray-300"
                    >
                      <Text className="text-sm text-gray-700">変更</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 杯数選択 */}
                  <View className="flex-row items-center justify-between mb-4 bg-white rounded-xl p-3">
                    <Text className="text-base font-semibold text-gray-900">杯数</Text>
                    <View className="flex-row items-center gap-3">
                      <TouchableOpacity
                        onPress={() => {
                          setCount(Math.max(1, count - 1));
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="bg-gray-200 w-10 h-10 rounded-full items-center justify-center"
                      >
                        <Text className="text-xl font-bold text-gray-700">−</Text>
                      </TouchableOpacity>
                      <Text className="text-2xl font-bold text-gray-900 w-10 text-center">
                        {count}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCount(count + 1);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="bg-primary-500 w-10 h-10 rounded-full items-center justify-center"
                      >
                        <Text className="text-xl font-bold text-white">+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* メモ */}
                  <View className="mb-4">
                    <TextInput
                      value={memo}
                      onChangeText={setMemo}
                      placeholder="メモ（任意）"
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* 純アルコール量 */}
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <Text className="text-sm text-amber-800">
                      純アルコール量: 約{' '}
                      <Text className="font-bold">
                        {(calculatePureAlcohol(selectedDrink.drink.ml, selectedDrink.drink.abv) * count).toFixed(1)}g
                      </Text>
                    </Text>
                  </View>

                  {/* 保存ボタン */}
                  <Button title="記録を保存" onPress={handleSave} fullWidth />
                </Card>
              </Animated.View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowSearch(true)}
                className="bg-white border-2 border-dashed border-gray-300 rounded-xl py-8 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-4xl mb-2">🔍</Text>
                <Text className="text-gray-600 font-semibold">タップして飲み物を検索</Text>
                <Text className="text-gray-400 text-sm mt-1">カテゴリ別・商品名で探せます</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* 検索モード */}
          {showSearch && (
            <Animated.View entering={FadeIn.duration(300)} className="px-6 pt-4 pb-6">
              <Card variant="elevated">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-bold text-gray-900">飲み物を検索</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                  >
                    <Text className="text-primary-600 font-semibold">閉じる</Text>
                  </TouchableOpacity>
                </View>

                {/* 検索バー */}
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="商品名で検索..."
                  className="bg-gray-100 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />

                {/* カテゴリー選択 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  <View className="flex-row gap-2">
                    {CATEGORY_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => {
                          setSelectedCategory(option.value);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className={`px-3 py-2 rounded-lg ${
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

                {/* 飲み物リスト */}
                {isLoadingProducts ? (
                  <View className="items-center py-8">
                    <ActivityIndicator size="large" color="#0ea5e9" />
                    <Text className="text-gray-500 mt-2">読み込み中...</Text>
                  </View>
                ) : allSearchDrinks.length === 0 ? (
                  <View className="items-center py-8">
                    <Text className="text-4xl mb-2">🔍</Text>
                    <Text className="text-gray-500">該当する商品がありません</Text>
                  </View>
                ) : (
                  <ScrollView
                    className="max-h-80"
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    <View className="space-y-2">
                      {allSearchDrinks.slice(0, 10).map(({ drink, isCustom }) => (
                        <TouchableOpacity
                          key={drink.id}
                          onPress={() => handleSelectDrink(drink, isCustom)}
                          className="flex-row items-center bg-gray-50 rounded-xl p-3"
                          activeOpacity={0.7}
                        >
                          <Text className="text-2xl mr-3">{drink.emoji || '🍺'}</Text>
                          <View className="flex-1">
                            <View className="flex-row items-center">
                              <Text className="text-base font-semibold text-gray-900">
                                {drink.name}
                              </Text>
                              {isCustom && (
                                <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                                  <Text className="text-xs text-amber-700 font-semibold">
                                    カスタム
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-sm text-gray-500">
                              {drink.ml}ml • {drink.abv}%
                            </Text>
                          </View>
                          <Text className="text-primary-600 font-semibold">選択</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </Card>
            </Animated.View>
          )}

          {/* 下部余白（タブバー分） */}
          <View className="h-24" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

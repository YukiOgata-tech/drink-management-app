import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  LayoutAnimation,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useProductsStore } from '@/stores/products';
import { useCustomDrinksStore } from '@/stores/customDrinks';
import { useDrinksStore } from '@/stores/drinks';
import { useUserStore } from '@/stores/user';
import { useThemeStore } from '@/stores/theme';
import { DrinkCategory, Product, CustomDrink, DefaultDrink } from '@/types';
import { calculatePureAlcohol } from '@/lib/products';
import {
  getAddPersonalCollapsedSections,
  setAddPersonalCollapsedSection,
} from '@/lib/storage/uiPreferences';
import Animated, { FadeInDown, FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Android用のLayoutAnimationを有効化
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// バーコードスキャンから渡される商品情報
type BarcodeProduct = {
  id: string;
  name: string;
  brand?: string;
  category: DrinkCategory;
  ml: number;
  abv: number;
  pureAlcoholG: number;
  emoji: string;
  barcode: string;
};

// 最大同時選択数
const MAX_SELECTIONS = 5;

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

// 選択されたドリンク情報（杯数付き）
type SelectedDrinkItem = {
  id: string; // ユニークキー用
  drink: Product | CustomDrink | DefaultDrink;
  isCustom: boolean;
  count: number;
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
  const { barcodeProduct } = useLocalSearchParams<{ barcodeProduct?: string }>();

  const user = useUserStore((state) => state.user);
  const addLog = usePersonalLogsStore((state) => state.addLog);
  const personalLogs = usePersonalLogsStore((state) => state.logs);

  const products = useProductsStore((state) => state.products);
  const isLoadingProducts = useProductsStore((state) => state.isLoading);
  const fetchProducts = useProductsStore((state) => state.fetchProducts);

  const customDrinks = useCustomDrinksStore((state) => state.drinks);
  const loadCustomDrinks = useCustomDrinksStore((state) => state.loadDrinks);

  const defaultDrinks = useDrinksStore((state) => state.defaultDrinks);

  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';

  // 複数選択対応
  const [selectedDrinks, setSelectedDrinks] = useState<SelectedDrinkItem[]>([]);
  const [memo, setMemo] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DrinkCategory>('beer');
  const [isSaving, setIsSaving] = useState(false);

  // スクロール関連
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const SCROLL_THRESHOLD = 150; // この高さ以上スクロールしたらボタン表示

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > SCROLL_THRESHOLD);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // セクション折りたたみ状態
  const [collapsedSections, setCollapsedSections] = useState({
    recentDrinks: false,
    popularDrinks: false,
  });

  useEffect(() => {
    fetchProducts();
    loadCustomDrinks();
    // 折りたたみ状態を読み込み
    loadCollapsedSections();
  }, []);

  const loadCollapsedSections = async () => {
    const saved = await getAddPersonalCollapsedSections();
    setCollapsedSections(saved);
  };

  const toggleSection = async (section: 'recentDrinks' | 'popularDrinks') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newValue = !collapsedSections[section];
    setCollapsedSections((prev) => ({ ...prev, [section]: newValue }));
    await setAddPersonalCollapsedSection(section, newValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // バーコードスキャンからの商品を処理
  useEffect(() => {
    if (barcodeProduct) {
      try {
        const product: BarcodeProduct = JSON.parse(barcodeProduct);
        const drinkInfo: DefaultDrink = {
          id: product.id,
          name: product.name,
          category: product.category,
          ml: product.ml,
          abv: product.abv,
          pureAlcoholG: product.pureAlcoholG,
          emoji: product.emoji,
        };

        // 既に選択済みでなければ追加
        const alreadySelected = selectedDrinks.some((item) => item.drink.id === product.id);
        if (!alreadySelected) {
          setSelectedDrinks((prev) => [
            ...prev,
            {
              id: `${product.id}_${Date.now()}`,
              drink: drinkInfo,
              isCustom: false,
              count: 1,
            },
          ]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.error('Failed to parse barcode product:', e);
      }
    }
  }, [barcodeProduct]);

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

  // ドリンクが選択済みかチェック
  const isDrinkSelected = (drinkId: string) => {
    return selectedDrinks.some((item) => item.drink.id === drinkId);
  };

  // ドリンクを追加
  const handleAddDrink = (drink: Product | CustomDrink | DefaultDrink, isCustom: boolean) => {
    if (selectedDrinks.length >= MAX_SELECTIONS) {
      Alert.alert('上限に達しました', `同時に記録できるのは${MAX_SELECTIONS}件までです`);
      return;
    }

    if (isDrinkSelected(drink.id)) {
      // 既に選択済みの場合は杯数を+1
      setSelectedDrinks((prev) =>
        prev.map((item) =>
          item.drink.id === drink.id ? { ...item, count: item.count + 1 } : item
        )
      );
    } else {
      // 新規追加
      setSelectedDrinks((prev) => [
        ...prev,
        {
          id: `${drink.id}_${Date.now()}`,
          drink,
          isCustom,
          count: 1,
        },
      ]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // ドリンクを削除
  const handleRemoveDrink = (itemId: string) => {
    setSelectedDrinks((prev) => prev.filter((item) => item.id !== itemId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // 杯数を変更
  const handleChangeCount = (itemId: string, delta: number) => {
    setSelectedDrinks((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newCount = Math.max(1, item.count + delta);
          return { ...item, count: newCount };
        }
        return item;
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // 保存処理
  const handleSave = async () => {
    if (selectedDrinks.length === 0) {
      Alert.alert('エラー', '飲み物を選択してください');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let totalLeveledUp = false;
    let finalNewLevel: number | undefined;
    let totalDebtPaid = 0;

    try {
      // 各ドリンクを順番に保存
      for (const item of selectedDrinks) {
        const pureAlcoholG = calculatePureAlcohol(item.drink.ml, item.drink.abv) * item.count;

        const log = {
          id: `personal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user?.id || 'guest',
          drinkId: item.drink.id,
          drinkName: item.drink.name,
          drinkCategory: item.drink.category,
          ml: item.drink.ml,
          abv: item.drink.abv,
          pureAlcoholG,
          count: item.count,
          memo: memo.trim() || undefined,
          recordedAt: new Date().toISOString(),
          isCustomDrink: item.isCustom,
        };

        const result = await addLog(log);

        if (result.leveledUp && result.newLevel) {
          totalLeveledUp = true;
          finalNewLevel = result.newLevel;
        }
        totalDebtPaid += result.debtPaid;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // フィードバック
      const recordCount = selectedDrinks.length;
      const totalDrinks = selectedDrinks.reduce((sum, item) => sum + item.count, 0);

      if (totalLeveledUp && finalNewLevel) {
        Alert.alert(
          'レベルアップ！',
          `${recordCount}件（${totalDrinks}杯）を記録しました！\nレベル ${finalNewLevel} になりました！`,
          [{ text: 'やったー！', onPress: () => router.back() }]
        );
      } else if (totalDebtPaid > 0) {
        Alert.alert(
          '記録を保存しました',
          `${recordCount}件（${totalDrinks}杯）を記録しました\n借金XP ${totalDebtPaid} を返済しました`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          '記録を保存しました',
          `${recordCount}件（${totalDrinks}杯）を記録しました`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      Alert.alert('エラー', '記録の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // クイック選択
  const handleQuickSelect = (drink: DefaultDrink) => {
    handleAddDrink(drink, false);
  };

  // 最近の記録から選択
  const handleRecentSelect = (recent: RecentDrinkInfo) => {
    const drinkInfo: DefaultDrink = {
      id: recent.id,
      name: recent.name,
      category: recent.category,
      ml: recent.ml,
      abv: recent.abv,
      pureAlcoholG: recent.pureAlcoholG,
      emoji: recent.emoji,
    };
    handleAddDrink(drinkInfo, recent.isCustom);
  };

  // 合計純アルコール量
  const totalPureAlcohol = selectedDrinks.reduce(
    (sum, item) => sum + calculatePureAlcohol(item.drink.ml, item.drink.abv) * item.count,
    0
  );

  // 合計杯数
  const totalCount = selectedDrinks.reduce((sum, item) => sum + item.count, 0);

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* ヘッダー */}
        <View className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
              <Feather name="arrow-left" size={16} color="#0284c7" />
              <Text className="text-primary-600 font-semibold text-base ml-1">
                戻る
              </Text>
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>個人記録を追加</Text>
            <View style={{ width: 50 }} />
          </View>
          {/* 選択件数バッジ */}
          {selectedDrinks.length > 0 && (
            <View className="mt-2 flex-row items-center justify-center">
              <View className={`px-3 py-1 rounded-full ${isDark ? 'bg-primary-900/30' : 'bg-primary-100'}`}>
                <Text className="text-primary-700 font-semibold text-sm">
                  {selectedDrinks.length}件選択中（{totalCount}杯）
                </Text>
              </View>
            </View>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {/* 選択中のドリンク一覧 */}
          {selectedDrinks.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)} className="px-6 pt-4">
              <Card variant="elevated" className={isDark ? 'bg-primary-900/20' : 'bg-primary-50'}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    選択中のドリンク
                  </Text>
                  <Text className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    最大{MAX_SELECTIONS}件
                  </Text>
                </View>

                {selectedDrinks.map((item) => (
                  <View
                    key={item.id}
                    className={`flex-row items-center rounded-xl p-3 mb-2 ${isDark ? 'bg-gray-700' : 'bg-white'}`}
                  >
                    <Text className="text-2xl mr-2">{item.drink.emoji || '🍺'}</Text>
                    <View className="flex-1">
                      <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`} numberOfLines={1}>
                        {item.drink.name}
                      </Text>
                      <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {(calculatePureAlcohol(item.drink.ml, item.drink.abv) * item.count).toFixed(1)}g
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity
                        onPress={() => handleChangeCount(item.id, -1)}
                        className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}
                      >
                        <Text className={`text-lg font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>−</Text>
                      </TouchableOpacity>
                      <Text className={`text-lg font-bold w-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {item.count}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleChangeCount(item.id, 1)}
                        className="bg-primary-500 w-8 h-8 rounded-full items-center justify-center"
                      >
                        <Text className="text-lg font-bold text-white">+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveDrink(item.id)}
                        className="ml-2"
                      >
                        <Feather name="x-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* メモ */}
                <TextInput
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="メモ（任意・全件共通）"
                  className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mt-2"
                  placeholderTextColor="#9CA3AF"
                />

                {/* 合計 */}
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                  <Text className="text-sm text-amber-800">
                    合計純アルコール量: 約{' '}
                    <Text className="font-bold">{totalPureAlcohol.toFixed(1)}g</Text>
                    {' '}（{totalCount}杯）
                  </Text>
                </View>

                {/* 保存ボタン */}
                <View className="mt-3">
                  <Button
                    title={isSaving ? '保存中...' : `${selectedDrinks.length}件を記録`}
                    onPress={handleSave}
                    disabled={isSaving}
                    fullWidth
                  />
                </View>
              </Card>
            </Animated.View>
          )}

          {/* 最近記録したドリンク */}
          {recentDrinks.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(400)} className="px-6 pt-6">
              <TouchableOpacity
                onPress={() => toggleSection('recentDrinks')}
                className="flex-row items-center justify-between mb-3"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    最近記録したドリンク
                  </Text>
                  <View className={`ml-2 px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{recentDrinks.length}</Text>
                  </View>
                </View>
                <Feather
                  name={collapsedSections.recentDrinks ? 'chevron-down' : 'chevron-up'}
                  size={20}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
              {!collapsedSections.recentDrinks && (
                <View className="flex-row flex-wrap gap-2">
                  {recentDrinks.map((drink) => (
                    <TouchableOpacity
                      key={`recent_${drink.id}_${drink.name}`}
                      onPress={() => handleRecentSelect(drink)}
                      className={`border rounded-xl px-4 py-3 flex-row items-center ${
                        isDrinkSelected(drink.id)
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
                      {isDrinkSelected(drink.id) && (
                        <Feather name="check-circle" size={18} color="#0ea5e9" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* クイック選択: 人気ドリンク */}
          <Animated.View entering={FadeInDown.delay(recentDrinks.length > 0 ? 100 : 50).duration(400)} className="px-6 pt-6">
            <TouchableOpacity
              onPress={() => toggleSection('popularDrinks')}
              className="flex-row items-center justify-between mb-3"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  よく使うドリンク
                </Text>
                <View className={`ml-2 px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{popularDrinks.length}</Text>
                </View>
              </View>
              <Feather
                name={collapsedSections.popularDrinks ? 'chevron-down' : 'chevron-up'}
                size={20}
                color={isDark ? '#9ca3af' : '#6b7280'}
              />
            </TouchableOpacity>
            {!collapsedSections.popularDrinks && (
              <View className="flex-row flex-wrap gap-2">
                {popularDrinks.map((drink) => (
                  <TouchableOpacity
                    key={drink.id}
                    onPress={() => handleQuickSelect(drink)}
                    className={`border rounded-xl px-4 py-3 flex-row items-center ${
                      isDrinkSelected(drink.id)
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
                    {isDrinkSelected(drink.id) && (
                      <Feather name="check-circle" size={18} color="#0ea5e9" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>

          {/* バーコードスキャン */}
          <Animated.View entering={FadeInDown.delay(recentDrinks.length > 0 ? 150 : 100).duration(400)} className="px-6 pt-6">
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

          {/* 選んで記録 */}
          <Animated.View entering={FadeInDown.delay(recentDrinks.length > 0 ? 200 : 150).duration(400)} className="px-6 pt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                選んで記録
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/drinks/add-custom-drink')}
                className={`px-3 py-1 rounded-lg ${isDark ? 'bg-primary-900/30' : 'bg-primary-50'}`}
              >
                <Text className="text-primary-600 font-semibold text-sm">
                  + カスタム追加
                </Text>
              </TouchableOpacity>
            </View>

            {/* 検索ボタン */}
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              className={`border-2 border-dashed rounded-xl py-6 items-center ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
              activeOpacity={0.7}
            >
              <View className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <Feather name="search" size={28} color={isDark ? '#9ca3af' : '#6b7280'} />
              </View>
              <Text className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>タップして飲み物を検索</Text>
              <Text className={`text-sm mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                カテゴリ別・商品名で探せます
              </Text>
            </TouchableOpacity>
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
                    <View className="w-14 h-14 bg-gray-100 rounded-full items-center justify-center mb-2">
                      <Feather name="search" size={28} color="#9ca3af" />
                    </View>
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
                          onPress={() => handleAddDrink(drink, isCustom)}
                          className={`flex-row items-center rounded-xl p-3 ${
                            isDrinkSelected(drink.id)
                              ? 'bg-primary-50 border border-primary-300'
                              : 'bg-gray-50'
                          }`}
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
                          {isDrinkSelected(drink.id) ? (
                            <View className="flex-row items-center">
                              <Text className="text-primary-600 font-semibold mr-1">追加済</Text>
                              <Feather name="check-circle" size={16} color="#0284c7" />
                            </View>
                          ) : (
                            <View className="flex-row items-center">
                              <Feather name="plus-circle" size={16} color="#0284c7" />
                              <Text className="text-primary-600 font-semibold ml-1">追加</Text>
                            </View>
                          )}
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

        {/* トップへ戻るフローティングボタン */}
        {showScrollToTop && selectedDrinks.length > 0 && (
          <Animated.View
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(300)}
            className="absolute bottom-28 right-4"
          >
            <TouchableOpacity
              onPress={scrollToTop}
              activeOpacity={0.8}
              className="bg-primary-500 w-11 h-11 rounded-full items-center justify-center"
              style={{
                shadowColor: '#0ea5e9',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Feather name="arrow-up" size={18} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

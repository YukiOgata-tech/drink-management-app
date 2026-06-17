import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, ResponsiveContainer, ResponsiveGrid } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDrinksStore } from '@/stores/drinks';
import { usePersonalLogsStore } from '@/stores/personalLogs';
import { useCustomDrinksStore } from '@/stores/customDrinks';
import { useDevStore } from '@/stores/dev';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { PersonalDrinkLog } from '@/types';
import { XP_VALUES } from '@/lib/xp';
import Animated, { FadeInDown, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

dayjs.locale('ja');

export default function DrinksScreen() {
  const user = useUserStore((state) => state.user);
  const drinkLogs = useDrinksStore((state) => state.drinkLogs);
  const defaultDrinks = useDrinksStore((state) => state.defaultDrinks);
  const addDrinkLog = useDrinksStore((state) => state.addDrinkLog);
  const getDefaultDrinkById = useDrinksStore((state) => state.getDefaultDrinkById);

  const personalLogs = usePersonalLogsStore((state) => state.logs);
  const loadPersonalLogs = usePersonalLogsStore((state) => state.loadLogs);
  const softDeleteLog = usePersonalLogsStore((state) => state.softDeleteLog);
  const restoreLog = usePersonalLogsStore((state) => state.restoreLog);
  const permanentlyDeleteLog = usePersonalLogsStore((state) => state.permanentlyDeleteLog);
  const customDrinks = useCustomDrinksStore((state) => state.drinks);
  const loadCustomDrinks = useCustomDrinksStore((state) => state.loadDrinks);
  const isGuest = useUserStore((state) => state.isGuest);

  // Undo toast state
  const [deletedLogInfo, setDeletedLogInfo] = useState<{ id: string; name: string } | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const UNDO_TIMEOUT = 5000; // 5秒間Undo可能

  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd, isTablet } = useResponsive();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrink, setSelectedDrink] = useState<any>(null);
  const [count, setCount] = useState(1);

  // スクロール関連
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const SCROLL_THRESHOLD = 100; // この高さ以上スクロールしたらボタン表示

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > SCROLL_THRESHOLD);
  }, []);

  const scrollToTop = useCallback(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // ソフトデリート実行（Undo可能）
  const handleDeleteLog = useCallback(async (log: PersonalDrinkLog) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 既存の削除タイマーをクリア
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
    }

    // ソフトデリート実行
    await softDeleteLog(log.id);
    setDeletedLogInfo({ id: log.id, name: log.drinkName });

    // 5秒後に完全削除
    deleteTimerRef.current = setTimeout(async () => {
      await permanentlyDeleteLog(log.id);
      setDeletedLogInfo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, UNDO_TIMEOUT);
  }, [softDeleteLog, permanentlyDeleteLog]);

  // Undo処理
  const handleUndo = useCallback(async () => {
    if (!deletedLogInfo) return;

    // タイマーをクリア
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    // 復元
    await restoreLog(deletedLogInfo.id);
    setDeletedLogInfo(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [deletedLogInfo, restoreLog]);

  useEffect(() => {
    loadPersonalLogs();
    loadCustomDrinks();
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  if (!user) return null;

  const userLogs = isDummyDataEnabled
    ? drinkLogs.filter((log) => log.userId === user.id).slice(0, 20)
    : [];

  // 個人記録を取得（最新20件）
  const recentPersonalLogs = personalLogs.slice(0, 20);

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
    const matchesCategory = !selectedCategory || drink.category === selectedCategory;
    const matchesSearch = !searchQuery || drink.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddDrink = () => {
    if (!selectedDrink) return;

    const newLog = {
      id: `log-${Date.now()}`,
      userId: user.id,
      drinkId: selectedDrink.id,
      drinkName: selectedDrink.name,
      ml: selectedDrink.ml,
      abv: selectedDrink.abv,
      pureAlcoholG: selectedDrink.pureAlcoholG,
      count,
      recordedById: user.id,
      status: 'approved' as const,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    addDrinkLog(newLog);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAddModal(false);
    setSelectedDrink(null);
    setCount(1);
    setSearchQuery('');
    setSelectedCategory(null);
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-6 py-6 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <View className="flex-row items-center">
            <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>飲酒記録</Text>
            <Feather name="edit-3" size={22} color="#0ea5e9" style={{ marginLeft: 8 }} />
          </View>
          <Text className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            日常の飲酒を記録しましょう
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ alignItems: isMd ? 'center' : undefined }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <ResponsiveContainer className={`px-6 py-6 ${isMd ? 'max-w-4xl' : ''}`}>
            {/* 記録追加ボタン */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/drinks/add-personal');
              }}
              activeOpacity={0.8}
              className={`bg-primary-500 rounded-xl py-4 flex-row items-center justify-center ${isMd ? 'max-w-md self-center w-full' : ''}`}
            >
              <Feather name="plus-circle" size={22} color="#ffffff" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold text-lg">個人記録を追加</Text>
            </TouchableOpacity>

          {/* 履歴 */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                最近の記録
              </Text>
              {recentPersonalLogs.length > 0 && (
                <Text className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  長押しで削除
                </Text>
              )}
            </View>
            {recentPersonalLogs.length > 0 ? (
              <ResponsiveGrid minItemWidth={320} gap={12}>
                {recentPersonalLogs.map((log, index) => {
                  const getCategoryEmoji = (category: string) => {
                    const emojiMap: Record<string, string> = {
                      beer: '🍺',
                      highball: '🥃',
                      chuhai_sour: '🍋',
                      shochu: '🥃',
                      sake: '🍶',
                      wine: '🍷',
                      cocktail: '🍹',
                      other: '🍸',
                    };
                    return emojiMap[category] || '🍺';
                  };

                  // この記録がその日の最初の記録かどうかを判定
                  const logDate = dayjs(log.recordedAt).format('YYYY-MM-DD');
                  const isFirstOfDay = !personalLogs.some(
                    (otherLog) =>
                      otherLog.id !== log.id &&
                      !otherLog.deletedAt &&
                      dayjs(otherLog.recordedAt).format('YYYY-MM-DD') === logDate &&
                      dayjs(otherLog.recordedAt).isBefore(dayjs(log.recordedAt))
                  );

                  // XP計算（同期済みの記録のみXPが付与されている、純アルコール量分）
                  const earnedXP = log.syncStatus === 'synced' || log.supabaseId
                    ? Math.floor(log.pureAlcoholG * log.count) + (isFirstOfDay ? XP_VALUES.DAILY_BONUS : 0)
                    : 0;

                  // 削除済みかどうか
                  const isDeleted = !!log.deletedAt;

                  return (
                    <Animated.View
                      key={log.id}
                      entering={FadeInDown.delay(250 + index * 30).duration(600)}
                      exiting={FadeOut.duration(300)}
                    >
                      <TouchableOpacity
                        onLongPress={() => !isDeleted && handleDeleteLog(log)}
                        delayLongPress={500}
                        activeOpacity={isDeleted ? 1 : 0.7}
                        disabled={isDeleted}
                      >
                        <Card variant="outlined" className={isDeleted ? 'opacity-50' : ''}>
                          <View className="flex-row items-center">
                            <Text className={`text-3xl mr-3 ${isDeleted ? 'opacity-50' : ''}`}>
                              {getCategoryEmoji(log.drinkCategory)}
                            </Text>
                            <View className="flex-1">
                              <View className="flex-row items-center">
                                <Text className={`text-base font-semibold ${isDeleted ? 'text-gray-400 line-through' : (isDark ? 'text-white' : 'text-gray-900')}`}>
                                  {log.drinkName}
                                </Text>
                                {isDeleted && (
                                  <View className="ml-2 bg-red-100 px-2 py-0.5 rounded">
                                    <Text className="text-xs text-red-600 font-semibold">
                                      削除済み
                                    </Text>
                                  </View>
                                )}
                                {!isDeleted && log.isCustomDrink && (
                                  <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded">
                                    <Text className="text-xs text-amber-700 font-semibold">
                                      カスタム
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text className={`text-sm mt-1 ${isDeleted ? 'text-gray-300' : (isDark ? 'text-gray-400' : 'text-gray-500')}`}>
                                {log.count}杯 • {log.pureAlcoholG.toFixed(1)}g
                              </Text>
                              <Text className={`text-xs mt-1 ${isDeleted ? 'text-gray-300' : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                                {dayjs(log.recordedAt).format('M月D日 HH:mm')}
                              </Text>
                              {!isDeleted && log.memo && (
                                <View className="flex-row items-center mt-1">
                                  <Feather name="message-circle" size={10} color="#4b5563" style={{ marginRight: 4 }} />
                                  <Text className="text-xs text-gray-600">
                                    {log.memo}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {!isDeleted && (
                              <View className="items-end">
                                {earnedXP > 0 && (
                                  <View className="bg-green-100 px-2 py-1 rounded-lg mb-1">
                                    <Text className="text-xs font-semibold text-green-600">
                                      +{earnedXP} XP
                                    </Text>
                                  </View>
                                )}
                                <View className="bg-blue-100 px-2 py-1 rounded-lg">
                                  <Text className="text-xs font-semibold text-blue-600">
                                    個人
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </Card>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </ResponsiveGrid>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <Feather name="edit-3" size={32} color={isDark ? '#6b7280' : '#9ca3af'} />
                  </View>
                  <Text className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>まだ記録がありません</Text>
                  <Button
                    title="最初の記録を追加"
                    size="sm"
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/(tabs)/drinks/add-personal');
                    }}
                  />
                </View>
              </Card>
            )}
          </Animated.View>
          </ResponsiveContainer>
        </ScrollView>

        {/* トップへ戻るフローティングボタン */}
        {showScrollToTop && (
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
      </View>

      {/* 記録追加モーダル */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50">
          <View className="flex-1">
            {/* モーダルヘッダー */}
            <View className="px-6 py-4 bg-white border-b border-gray-200 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedDrink(null);
                  setCount(1);
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
              >
                <Text className="text-primary-600 font-semibold text-base">
                  キャンセル
                </Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-gray-900">
                ドリンクを選択
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView className="flex-1 px-6 py-6">
              {/* 検索バー */}
              <View className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4">
                <TextInput
                  placeholder="ドリンクを検索..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="text-base"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* カテゴリ選択 */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-6"
              >
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-xl ${
                      !selectedCategory
                        ? 'bg-primary-500'
                        : 'bg-gray-200'
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

              {/* ドリンクリスト */}
              <View className="gap-y-2">
                {filteredDrinks.map((drink) => (
                  <TouchableOpacity
                    key={drink.id}
                    onPress={() => setSelectedDrink(drink)}
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
                            {drink.ml}ml • {drink.abv}% • {drink.pureAlcoholG.toFixed(1)}g
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
            </ScrollView>

            {/* 杯数選択とボタン */}
            {selectedDrink && (
              <Animated.View
                entering={FadeIn.duration(300)}
                className="px-6 py-4 bg-white border-t border-gray-200"
              >
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-semibold text-gray-900">
                    杯数
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => setCount(Math.max(1, count - 1))}
                      className="bg-gray-200 w-10 h-10 rounded-full items-center justify-center"
                    >
                      <Text className="text-xl font-bold text-gray-700">−</Text>
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold text-gray-900 w-12 text-center">
                      {count}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCount(count + 1)}
                      className="bg-primary-500 w-10 h-10 rounded-full items-center justify-center"
                    >
                      <Text className="text-xl font-bold text-white">＋</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Button
                  title={`追加 (${(selectedDrink.pureAlcoholG * count).toFixed(1)}g)`}
                  onPress={handleAddDrink}
                  fullWidth
                />
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Undo Toast */}
      {deletedLogInfo && (
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(300)}
          className="absolute bottom-8 left-4 right-4"
        >
          <View className="bg-gray-800 rounded-xl px-4 py-3 flex-row items-center justify-between shadow-lg">
            <View className="flex-1 mr-3">
              <Text className="text-white font-medium" numberOfLines={1}>
                「{deletedLogInfo.name}」を削除しました
              </Text>
              {!isGuest && (
                <Text className="text-gray-400 text-xs mt-0.5">
                  XPが借金として記録されます
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleUndo}
              className="bg-primary-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-semibold">元に戻す</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

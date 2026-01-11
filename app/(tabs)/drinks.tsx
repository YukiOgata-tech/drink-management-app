import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import { useDrinksStore } from '@/stores/drinks';
import { useDevStore } from '@/stores/dev';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
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
  const isDummyDataEnabled = useDevStore((state) => state.isDummyDataEnabled);

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrink, setSelectedDrink] = useState<any>(null);
  const [count, setCount] = useState(1);

  if (!user) return null;

  const userLogs = isDummyDataEnabled
    ? drinkLogs.filter((log) => log.userId === user.id).slice(0, 20)
    : [];

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
      ml: selectedDrink.ml,
      abv: selectedDrink.abv,
      pureAlcoholG: selectedDrink.pureAlcoholG,
      count,
      status: 'approved' as const,
      recordedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* ヘッダー */}
        <View className="px-6 py-6 bg-white border-b border-gray-200">
          <Text className="text-2xl font-bold text-gray-900">飲酒記録 📝</Text>
          <Text className="text-sm text-gray-500 mt-1">
            日常の飲酒を記録しましょう
          </Text>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* 記録追加ボタン */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Button
              title="記録を追加"
              icon={<Text className="text-xl">➕</Text>}
              onPress={() => setShowAddModal(true)}
              fullWidth
              size="lg"
            />
          </Animated.View>

          {/* 履歴 */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} className="mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              最近の記録{isDummyDataEnabled && '（ダミーデータ）'}
            </Text>
            {isDummyDataEnabled && userLogs.length > 0 ? (
              <View className="space-y-3">
                {userLogs.map((log, index) => {
                  const drink = getDefaultDrinkById(log.drinkId || '');
                  return (
                    <Animated.View
                      key={log.id}
                      entering={FadeInDown.delay(250 + index * 30).duration(600)}
                    >
                      <Card variant="outlined">
                        <View className="flex-row items-center">
                          <Text className="text-3xl mr-3">{drink?.emoji || '🍺'}</Text>
                          <View className="flex-1">
                            <Text className="text-base font-semibold text-gray-900">
                              {drink?.name || 'カスタムドリンク'}
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1">
                              {log.count}杯 • {(log.pureAlcoholG * log.count).toFixed(1)}g
                            </Text>
                            <Text className="text-xs text-gray-400 mt-1">
                              {dayjs(log.recordedAt).format('M月D日 HH:mm')}
                            </Text>
                          </View>
                          {!log.eventId && (
                            <View className="bg-blue-100 px-2 py-1 rounded-lg">
                              <Text className="text-xs font-semibold text-blue-600">
                                日常
                              </Text>
                            </View>
                          )}
                        </View>
                      </Card>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <Card variant="outlined">
                <View className="items-center py-12">
                  <Text className="text-4xl mb-2">📝</Text>
                  <Text className="text-gray-500">まだ記録がありません</Text>
                </View>
              </Card>
            )}
          </Animated.View>
        </ScrollView>
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
              <View className="space-y-2">
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
                          <Text className="text-2xl">✓</Text>
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
    </SafeAreaView>
  );
}

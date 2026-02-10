import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Input, ResponsiveContainer } from '@/components/ui';
import { useCustomDrinksStore } from '@/stores/customDrinks';
import { useThemeStore } from '@/stores/theme';
import { useResponsive } from '@/lib/responsive';
import { DrinkCategory } from '@/types';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const CATEGORY_OPTIONS: { value: DrinkCategory; label: string; emoji: string }[] = [
  { value: 'beer', label: 'ビール', emoji: '🍺' },
  { value: 'highball', label: 'ハイボール', emoji: '🥃' },
  { value: 'chuhai_sour', label: 'チューハイ・サワー', emoji: '🍋' },
  { value: 'shochu', label: '焼酎', emoji: '🥃' },
  { value: 'sake', label: '日本酒', emoji: '🍶' },
  { value: 'wine', label: 'ワイン', emoji: '🍷' },
  { value: 'cocktail', label: 'カクテル', emoji: '🍹' },
  { value: 'other', label: 'その他', emoji: '🍸' },
];

export default function AddCustomDrinkScreen() {
  const addDrink = useCustomDrinksStore((state) => state.addDrink);
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const isDark = colorScheme === 'dark';
  const { isMd } = useResponsive();

  const [category, setCategory] = useState<DrinkCategory>('beer');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [ml, setMl] = useState('');
  const [abv, setAbv] = useState('');
  const [notes, setNotes] = useState('');

  const selectedEmoji = CATEGORY_OPTIONS.find((c) => c.value === category)?.emoji || '🍺';

  const handleSave = () => {
    // バリデーション
    if (!name.trim()) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }

    const mlValue = parseInt(ml);
    if (!ml || isNaN(mlValue) || mlValue <= 0) {
      Alert.alert('エラー', '正しい容量を入力してください');
      return;
    }

    const abvValue = parseFloat(abv);
    if (!abv || isNaN(abvValue) || abvValue < 0 || abvValue > 100) {
      Alert.alert('エラー', 'アルコール度数は0〜100の範囲で入力してください');
      return;
    }

    // カスタムドリンクを追加
    const customDrink = {
      id: `custom_${Date.now()}`,
      category,
      name: name.trim(),
      brand: brand.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      ml: mlValue,
      abv: abvValue,
      emoji: selectedEmoji,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    addDrink(customDrink);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('登録完了', 'カスタムドリンクを登録しました', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className={`flex-1 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <View className="flex-1">
        {/* ヘッダー */}
        <View className={`px-6 py-4 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <TouchableOpacity onPress={() => router.back()} className="mb-2 flex-row items-center">
            <Feather name="arrow-left" size={16} color="#0284c7" />
            <Text className="text-primary-600 font-semibold text-base ml-1">
              戻る
            </Text>
          </TouchableOpacity>
          <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            カスタムドリンク追加
          </Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: isMd ? 'center' : undefined, paddingHorizontal: 24, paddingVertical: 24 }}
        >
          <ResponsiveContainer className={isMd ? 'max-w-2xl w-full' : 'w-full'}>
          {/* カテゴリー選択 */}
          <Animated.View entering={FadeInDown.delay(50).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-3">
                カテゴリー
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setCategory(option.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      category === option.value
                        ? 'bg-primary-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        category === option.value
                          ? 'text-white font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {option.emoji} {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          </Animated.View>

          {/* 基本情報 */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <Card variant="elevated" className="mb-6">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                基本情報
              </Text>

              <Input
                label="商品名 *"
                value={name}
                onChangeText={setName}
                placeholder="例: プレミアムモルツ"
                icon={<Text className="text-xl">{selectedEmoji}</Text>}
              />

              <Input
                label="ブランド名"
                value={brand}
                onChangeText={setBrand}
                placeholder="例: ザ・プレミアム・モルツ"
              />

              <Input
                label="メーカー名"
                value={manufacturer}
                onChangeText={setManufacturer}
                placeholder="例: サントリー"
              />

              <Input
                label="容量 (ml) *"
                value={ml}
                onChangeText={setMl}
                keyboardType="numeric"
                placeholder="例: 350"
                icon={<Feather name="droplet" size={20} color="#6b7280" />}
              />

              <Input
                label="アルコール度数 (%) *"
                value={abv}
                onChangeText={setAbv}
                keyboardType="decimal-pad"
                placeholder="例: 5.5"
                icon={<Feather name="percent" size={20} color="#6b7280" />}
              />

              <Input
                label="メモ"
                value={notes}
                onChangeText={setNotes}
                placeholder="味の特徴など..."
                multiline
                numberOfLines={3}
                icon={<Feather name="edit-3" size={20} color="#6b7280" />}
              />
            </Card>
          </Animated.View>

          {/* 保存ボタン */}
          <Animated.View entering={FadeInDown.delay(150).duration(600)}>
            <Button title="登録する" onPress={handleSave} fullWidth />
          </Animated.View>

          {/* 下部余白（タブバー分） */}
          <View className="h-24" />
          </ResponsiveContainer>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

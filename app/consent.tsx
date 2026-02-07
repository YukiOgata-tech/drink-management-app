import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/components/ui';
import { useConsentStore } from '@/stores/consent';
import { LEGAL_VERSIONS } from '@/types';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

export default function ConsentScreen() {
  const {
    consentRecord,
    isLoaded,
    loadConsent,
    isFullyConsented,
    completeConsent,
  } = useConsentStore();

  // ステップ管理
  const [currentStep, setCurrentStep] = useState<'age' | 'terms' | 'complete'>('age');
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // 年齢確認
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // 同意チェック
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);

  // スクロール確認
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // ナビゲーションの準備完了を待つ
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 初期化
  useEffect(() => {
    if (isNavigationReady) {
      loadConsent();
    }
  }, [isNavigationReady]);

  // すでに同意済みの場合は自動的にタブに遷移
  useEffect(() => {
    if (isNavigationReady && isLoaded && isFullyConsented()) {
      router.replace('/(tabs)');
    }
  }, [isNavigationReady, isLoaded, consentRecord]);

  // 年齢計算
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // 年齢確認ステップの完了
  const handleAgeVerification = () => {
    if (!birthday) {
      Alert.alert('エラー', '生年月日を選択してください');
      return;
    }

    const age = calculateAge(birthday);
    if (age < 20) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        '年齢制限',
        '本アプリは20歳以上の方を対象としています。\n\n20歳未満の方はご利用いただけません。',
        [{ text: '閉じる' }]
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep('terms');
  };

  // 最終同意
  const handleFinalConsent = async () => {
    if (!birthday) return;

    if (!agreedToTerms || !agreedToPrivacy || !acknowledgedWarning) {
      Alert.alert('エラー', 'すべての項目に同意してください');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const birthdayStr = dayjs(birthday).format('YYYY-MM-DD');
    await completeConsent(birthdayStr);

    router.replace('/(tabs)');
  };

  // 日付選択ハンドラー
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthday(selectedDate);
    }
  };

  // ローディング中またはナビゲーション未準備
  if (!isNavigationReady || !isLoaded) {
    return (
      <View className="flex-1 bg-white items-center justify-center pt-20">
        <Text className="text-4xl mb-4">🍺</Text>
        <Text className="text-gray-500">読み込み中...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gradient-to-b from-primary-50 to-white">
      <Animated.View entering={FadeIn.duration(600)} className="flex-1 px-6 py-6">
        {/* ヘッダー */}
        <View className="items-center mb-6">
          <Text className="text-4xl mb-3">🍺</Text>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            Alcohol Log & Event Hub
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            飲酒記録・振り返りアプリ
          </Text>
        </View>

        {/* ステップインジケーター */}
        <View className="flex-row justify-center mb-6">
          <View className="flex-row items-center">
            <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStep === 'age' ? 'bg-primary-500' : 'bg-primary-200'}`}>
              <Text className="text-white font-bold">1</Text>
            </View>
            <View className={`w-12 h-1 ${currentStep === 'terms' ? 'bg-primary-500' : 'bg-gray-200'}`} />
            <View className={`w-8 h-8 rounded-full items-center justify-center ${currentStep === 'terms' ? 'bg-primary-500' : 'bg-gray-200'}`}>
              <Text className={currentStep === 'terms' ? 'text-white font-bold' : 'text-gray-400 font-bold'}>2</Text>
            </View>
          </View>
        </View>

        {/* ステップ1: 年齢確認 */}
        {currentStep === 'age' && (
          <Animated.View entering={FadeInDown.duration(600)} className="flex-1">
            <Card variant="elevated" className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-2">
                年齢確認
              </Text>
              <Text className="text-sm text-gray-600 mb-4">
                本アプリは20歳以上の方を対象としています
              </Text>

              {/* 警告ボックス */}
              <View className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
                <Text className="text-base font-bold text-red-900 mb-2">
                  法令に基づく注意事項
                </Text>
                <Text className="text-sm text-red-800 leading-6">
                  未成年者飲酒禁止法により、20歳未満の者が飲酒すること、および20歳未満の者に対して酒類を販売・供与することは禁止されています。
                </Text>
              </View>

              {/* 生年月日選択 */}
              <View className="mb-6">
                <Text className="text-base font-semibold text-gray-900 mb-3">
                  生年月日を入力してください
                </Text>

                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="bg-gray-100 border border-gray-300 rounded-xl p-4"
                >
                  <Text className={`text-center text-lg ${birthday ? 'text-gray-900' : 'text-gray-400'}`}>
                    {birthday ? dayjs(birthday).format('YYYY年M月D日') : 'タップして選択'}
                  </Text>
                </TouchableOpacity>

                {birthday && (
                  <Text className="text-center text-sm text-gray-500 mt-2">
                    {calculateAge(birthday)}歳
                  </Text>
                )}

                {(showDatePicker || Platform.OS === 'ios') && (
                  <View className={Platform.OS === 'ios' ? 'mt-4' : ''}>
                    <DateTimePicker
                      value={birthday || new Date(2000, 0, 1)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      maximumDate={new Date()}
                      minimumDate={new Date(1900, 0, 1)}
                      locale="ja-JP"
                    />
                    {Platform.OS === 'ios' && (
                      <Button
                        title="確定"
                        size="sm"
                        onPress={() => setShowDatePicker(false)}
                        className="mt-2"
                      />
                    )}
                  </View>
                )}
              </View>

              <View className="flex-1" />

              <Button
                title="次へ進む"
                onPress={handleAgeVerification}
                disabled={!birthday}
                fullWidth
              />
            </Card>
          </Animated.View>
        )}

        {/* ステップ2: 利用規約・プライバシーポリシー同意 */}
        {currentStep === 'terms' && (
          <Animated.View entering={FadeInDown.duration(600)} className="flex-1">
            <Card variant="elevated" className="flex-1">
              <Text className="text-xl font-bold text-gray-900 mb-2">
                ご利用にあたって
              </Text>
              <Text className="text-sm text-gray-600 mb-4">
                以下の内容をご確認の上、同意してください
              </Text>

              <ScrollView
                className="flex-1 mb-4"
                showsVerticalScrollIndicator={true}
                onScroll={(e) => {
                  const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                  const isNearBottom =
                    contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
                  if (isNearBottom) setHasScrolledToBottom(true);
                }}
                scrollEventThrottle={400}
              >
                <View className="space-y-4">
                  {/* アプリの目的 */}
                  <View>
                    <Text className="text-base font-semibold text-gray-900 mb-2">
                      本アプリの目的
                    </Text>
                    <Text className="text-sm text-gray-700 leading-6">
                      本アプリは、飲酒を促進するものではありません。飲酒量や体調の記録・可視化・振り返りを通じて、ご自身の「適量」を把握し、健康的な飲酒習慣をサポートすることを目的としています。
                    </Text>
                  </View>

                  {/* 飲酒に関する警告 */}
                  <View className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <Text className="text-base font-bold text-red-900 mb-2">
                      飲酒に関する重要な注意事項
                    </Text>
                    <Text className="text-sm text-red-800 leading-6">
                      • 20歳未満の飲酒は法律で禁止されています{'\n'}
                      • 飲酒運転は絶対にしないでください{'\n'}
                      • 妊娠中・授乳中の飲酒はお控えください{'\n'}
                      • 過度の飲酒は健康を害します{'\n'}
                      • 飲酒に関するお悩みは専門機関にご相談ください
                    </Text>
                  </View>

                  {/* データの取り扱い */}
                  <View>
                    <Text className="text-base font-semibold text-gray-900 mb-2">
                      データの取り扱い
                    </Text>
                    <Text className="text-sm text-gray-700 leading-6">
                      • あなたの記録は個人アカウントに紐づいて保存されます{'\n'}
                      • イベント参加者間で記録を共有できます{'\n'}
                      • 記録の精度は入力内容により変動します{'\n'}
                      • 本アプリの算出値は医療的判断の根拠となりません
                    </Text>
                  </View>

                  {/* 免責事項 */}
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <Text className="text-base font-bold text-amber-900 mb-2">
                      免責事項
                    </Text>
                    <Text className="text-sm text-amber-800 leading-6">
                      本アプリは「現状有姿」で提供されます。本アプリの利用により生じた損害について、開発者は一切の責任を負いません。飲酒に関する判断は、ご自身の責任において行ってください。
                    </Text>
                  </View>

                  {/* 健康ガイドライン */}
                  <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <Text className="text-base font-bold text-green-900 mb-2">
                      健康的な飲酒のために
                    </Text>
                    <Text className="text-sm text-green-800 leading-6">
                      厚生労働省の基準では、1日あたりの適正飲酒量は純アルコール換算で男性約20g、女性約10gとされています。週に2日程度の休肝日も推奨されています。
                    </Text>
                  </View>

                  {/* バージョン情報 */}
                  <View className="bg-gray-100 rounded-lg p-3">
                    <Text className="text-xs text-gray-500">
                      利用規約 v{LEGAL_VERSIONS.TERMS} | プライバシーポリシー v{LEGAL_VERSIONS.PRIVACY_POLICY}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* 同意チェックボックス */}
              <View className="space-y-3 mb-4">
                {/* 利用規約 */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToTerms(!agreedToTerms);
                  }}
                  className="flex-row items-start"
                >
                  <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${agreedToTerms ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                    {agreedToTerms && <Feather name="check" size={14} color="#ffffff" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-800">
                      <TouchableOpacity onPress={() => router.push('/legal/terms')}>
                        <Text className="text-primary-600 underline">利用規約</Text>
                      </TouchableOpacity>
                      に同意します
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* プライバシーポリシー */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToPrivacy(!agreedToPrivacy);
                  }}
                  className="flex-row items-start"
                >
                  <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${agreedToPrivacy ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                    {agreedToPrivacy && <Feather name="check" size={14} color="#ffffff" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-800">
                      <TouchableOpacity onPress={() => router.push('/legal/privacy-policy')}>
                        <Text className="text-primary-600 underline">プライバシーポリシー</Text>
                      </TouchableOpacity>
                      に同意します
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* 飲酒注意事項確認 */}
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAcknowledgedWarning(!acknowledgedWarning);
                  }}
                  className="flex-row items-start"
                >
                  <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${acknowledgedWarning ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                    {acknowledgedWarning && <Feather name="check" size={14} color="#ffffff" />}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-gray-800">
                      飲酒に関する注意事項を確認し、理解しました（
                      <TouchableOpacity onPress={() => router.push('/legal/drinking-guide')}>
                        <Text className="text-primary-600 underline">飲酒ガイドライン</Text>
                      </TouchableOpacity>
                      ）
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {!hasScrolledToBottom && (
                <Text className="text-xs text-gray-500 text-center mb-2">
                  最後までスクロールしてください
                </Text>
              )}

              <Button
                title="同意して始める"
                onPress={handleFinalConsent}
                disabled={!hasScrolledToBottom || !agreedToTerms || !agreedToPrivacy || !acknowledgedWarning}
                fullWidth
              />
            </Card>
          </Animated.View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

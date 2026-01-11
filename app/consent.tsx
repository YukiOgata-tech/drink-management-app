import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@/components/ui';
import { useUserStore } from '@/stores/user';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function ConsentScreen() {
  const router = useRouter();
  const hasAgreedToConsent = useUserStore((state) => state.hasAgreedToConsent);
  const agreeToConsent = useUserStore((state) => state.agreeToConsent);
  const [hasScrolled, setHasScrolled] = useState(false);

  // すでに同意済みの場合は自動的にタブに遷移
  useEffect(() => {
    if (hasAgreedToConsent) {
      router.replace('/(tabs)');
    }
  }, [hasAgreedToConsent]);

  const handleAgree = () => {
    agreeToConsent();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gradient-to-b from-primary-50 to-white">
      <Animated.View
        entering={FadeIn.duration(600)}
        className="flex-1 px-6 py-8"
      >
        <View className="items-center mb-8">
          <Text className="text-4xl mb-4">🍺</Text>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            Alcohol Log & Event Hub
          </Text>
          <Text className="text-sm text-gray-500 mt-2">
            飲酒記録・振り返りアプリ
          </Text>
        </View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600)}
          className="flex-1"
        >
          <Card variant="elevated" className="flex-1">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              ご利用にあたって
            </Text>

            <ScrollView
              className="flex-1 mb-6"
              showsVerticalScrollIndicator={true}
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const isNearBottom =
                  contentOffset.y + layoutMeasurement.height >= contentSize.height - 50;
                if (isNearBottom) setHasScrolled(true);
              }}
              scrollEventThrottle={400}
            >
              <View className="space-y-4">
                {/* 警告セクション */}
                <View className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <Text className="text-base font-bold text-red-900 mb-2">
                    ⚠️ 飲酒に関する重要な注意事項
                  </Text>
                  <Text className="text-sm text-red-800 leading-6">
                    • 20歳未満の飲酒は法律で禁止されています{'\n'}
                    • 飲酒運転は絶対にしないでください{'\n'}
                    • 妊娠中・授乳中の飲酒はお控えください{'\n'}
                    • 適正飲酒を心がけ、無理な飲酒は避けてください
                  </Text>
                </View>

                {/* アプリの目的 */}
                <View>
                  <Text className="text-base font-semibold text-gray-900 mb-2">
                    本アプリの目的
                  </Text>
                  <Text className="text-sm text-gray-700 leading-6">
                    本アプリは、飲酒を促進するものではありません。飲酒量や体調の記録・可視化・振り返りを通じて、ご自身の「適量」を把握し、健康的な飲酒習慣をサポートすることを目的としています。
                  </Text>
                </View>

                {/* データの取り扱い */}
                <View>
                  <Text className="text-base font-semibold text-gray-900 mb-2">
                    データの取り扱い
                  </Text>
                  <Text className="text-sm text-gray-700 leading-6">
                    • あなたの記録は個人アカウントに紐づいて保存されます{'\n'}
                    • イベント（飲み会）に参加した場合、そのイベントの参加者と記録を共有できます{'\n'}
                    • 記録の精度は、入力内容や商品により変動する場合があります{'\n'}
                    • 本アプリの算出値は推定値であり、医療的判断の根拠とはなりません
                  </Text>
                </View>

                {/* 利用規約 */}
                <View>
                  <Text className="text-base font-semibold text-gray-900 mb-2">
                    利用規約
                  </Text>
                  <Text className="text-sm text-gray-700 leading-6">
                    • 本アプリは現状有姿で提供されます{'\n'}
                    • アプリの利用により生じた損害について、開発者は責任を負いません{'\n'}
                    • 本規約は予告なく変更される場合があります
                  </Text>
                </View>

                {/* 健康に関する注意 */}
                <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Text className="text-base font-bold text-amber-900 mb-2">
                    💡 健康的な飲酒のために
                  </Text>
                  <Text className="text-sm text-amber-800 leading-6">
                    厚生労働省の基準では、成人男性の1日あたりの適正飲酒量は純アルコール換算で約20g、女性はその半分程度とされています。週に2日程度の休肝日を設けることも推奨されています。
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Button
              title="同意して始める"
              onPress={handleAgree}
              disabled={!hasScrolled}
              fullWidth
            />
            {!hasScrolled && (
              <Text className="text-xs text-gray-500 text-center mt-2">
                最後までスクロールしてください
              </Text>
            )}
          </Card>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

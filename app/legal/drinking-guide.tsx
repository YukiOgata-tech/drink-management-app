import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card } from '@/components/ui';
import { LEGAL_VERSIONS } from '@/types';

export default function DrinkingGuideScreen() {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ヘッダー */}
      <View className="px-6 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary-600 text-base">戻る</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">
          飲酒ガイドライン
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        <View className="space-y-6 pb-8">
          {/* バージョン情報 */}
          <View className="bg-gray-100 rounded-lg p-3">
            <Text className="text-sm text-gray-600">
              バージョン: {LEGAL_VERSIONS.DRINKING_GUIDELINES} | 参考: 厚生労働省「健康日本21」
            </Text>
          </View>

          {/* 重要な警告 */}
          <View className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <Text className="text-lg font-bold text-red-900 mb-3">
              飲酒に関する重要な注意事項
            </Text>
            <View className="space-y-2">
              <View className="flex-row">
                <Text className="text-red-800 mr-2">1.</Text>
                <Text className="text-base text-red-800 leading-7 flex-1">
                  <Text className="font-bold">20歳未満の者の飲酒は法律で禁止されています。</Text>
                  {'\n'}未成年者飲酒禁止法により、20歳未満の者が飲酒することは禁止されています。
                </Text>
              </View>
              <View className="flex-row">
                <Text className="text-red-800 mr-2">2.</Text>
                <Text className="text-base text-red-800 leading-7 flex-1">
                  <Text className="font-bold">飲酒運転は絶対にしないでください。</Text>
                  {'\n'}道路交通法により、酒気帯び運転・酒酔い運転は厳しく罰せられます。
                </Text>
              </View>
              <View className="flex-row">
                <Text className="text-red-800 mr-2">3.</Text>
                <Text className="text-base text-red-800 leading-7 flex-1">
                  <Text className="font-bold">妊娠中・授乳中の飲酒はお控えください。</Text>
                  {'\n'}胎児や乳児への悪影響が報告されています。
                </Text>
              </View>
            </View>
          </View>

          {/* 適正飲酒量 */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              適正な飲酒量について
            </Text>
            <Card variant="outlined">
              <Text className="text-base text-gray-800 leading-7 mb-4">
                厚生労働省の「健康日本21」では、「節度ある適度な飲酒」として以下の基準を示しています。
              </Text>
              <View className="bg-primary-50 rounded-lg p-4 space-y-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">👨</Text>
                  <View>
                    <Text className="font-bold text-gray-900">成人男性</Text>
                    <Text className="text-gray-700">1日あたり純アルコール約20g以下</Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">👩</Text>
                  <View>
                    <Text className="font-bold text-gray-900">成人女性</Text>
                    <Text className="text-gray-700">1日あたり純アルコール約10g以下</Text>
                  </View>
                </View>
              </View>
              <Text className="text-sm text-gray-600 mt-3">
                ※ 女性や高齢者、アルコール代謝能力の低い方は、より少量が適切です。
              </Text>
            </Card>
          </View>

          {/* 純アルコール量の目安 */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              純アルコール20gの目安
            </Text>
            <View className="space-y-3">
              <View className="flex-row bg-amber-50 rounded-lg p-3 items-center">
                <Text className="text-3xl mr-4">🍺</Text>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">ビール（5%）</Text>
                  <Text className="text-gray-700">中びん1本（500ml）</Text>
                </View>
                <Text className="text-amber-700 font-bold">約20g</Text>
              </View>
              <View className="flex-row bg-amber-50 rounded-lg p-3 items-center">
                <Text className="text-3xl mr-4">🍶</Text>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">日本酒（15%）</Text>
                  <Text className="text-gray-700">1合（180ml）</Text>
                </View>
                <Text className="text-amber-700 font-bold">約22g</Text>
              </View>
              <View className="flex-row bg-amber-50 rounded-lg p-3 items-center">
                <Text className="text-3xl mr-4">🥃</Text>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">ウイスキー（40%）</Text>
                  <Text className="text-gray-700">ダブル1杯（60ml）</Text>
                </View>
                <Text className="text-amber-700 font-bold">約20g</Text>
              </View>
              <View className="flex-row bg-amber-50 rounded-lg p-3 items-center">
                <Text className="text-3xl mr-4">🍷</Text>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">ワイン（12%）</Text>
                  <Text className="text-gray-700">グラス2杯（200ml）</Text>
                </View>
                <Text className="text-amber-700 font-bold">約20g</Text>
              </View>
              <View className="flex-row bg-amber-50 rounded-lg p-3 items-center">
                <Text className="text-3xl mr-4">🍋</Text>
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">チューハイ（7%）</Text>
                  <Text className="text-gray-700">350ml缶1本</Text>
                </View>
                <Text className="text-amber-700 font-bold">約20g</Text>
              </View>
            </View>
            <View className="bg-gray-100 rounded-lg p-3 mt-3">
              <Text className="text-sm text-gray-700">
                <Text className="font-bold">計算式：</Text> 純アルコール量(g) = 飲酒量(ml) × アルコール度数(%) × 0.8
              </Text>
            </View>
          </View>

          {/* 休肝日について */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              休肝日について
            </Text>
            <Card variant="outlined">
              <Text className="text-base text-gray-800 leading-7">
                週に2日程度は飲酒しない日（休肝日）を設けることが推奨されています。連続して飲酒を続けると、肝臓への負担が蓄積し、健康リスクが高まります。
              </Text>
              <View className="bg-green-50 rounded-lg p-3 mt-3">
                <Text className="text-green-800 font-semibold">
                  推奨：週に2日以上の休肝日
                </Text>
              </View>
            </Card>
          </View>

          {/* 健康リスク */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              過度な飲酒による健康リスク
            </Text>
            <View className="space-y-3">
              <View className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <Text className="font-bold text-orange-900 mb-2">短期的なリスク</Text>
                <Text className="text-orange-800 leading-6">
                  • 急性アルコール中毒{'\n'}
                  • 判断力・運動能力の低下{'\n'}
                  • 事故・怪我のリスク増加{'\n'}
                  • 二日酔い
                </Text>
              </View>
              <View className="bg-red-50 border border-red-200 rounded-lg p-4">
                <Text className="font-bold text-red-900 mb-2">長期的なリスク</Text>
                <Text className="text-red-800 leading-6">
                  • アルコール依存症{'\n'}
                  • 肝臓疾患（脂肪肝、肝硬変）{'\n'}
                  • 膵臓疾患{'\n'}
                  • 高血圧、心臓病{'\n'}
                  • 各種がん（食道、肝臓、大腸など）{'\n'}
                  • うつ病、認知症
                </Text>
              </View>
            </View>
          </View>

          {/* 飲酒を控えるべき方 */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              飲酒を控えるべき方
            </Text>
            <Card variant="outlined">
              <View className="space-y-2">
                <Text className="text-base text-gray-800 leading-7">• 20歳未満の方</Text>
                <Text className="text-base text-gray-800 leading-7">• 妊娠中または妊娠の可能性がある方</Text>
                <Text className="text-base text-gray-800 leading-7">• 授乳中の方</Text>
                <Text className="text-base text-gray-800 leading-7">• 運転や危険を伴う作業をする方</Text>
                <Text className="text-base text-gray-800 leading-7">• アルコール依存症から回復途中の方</Text>
                <Text className="text-base text-gray-800 leading-7">• 特定の薬を服用中の方（医師・薬剤師にご相談ください）</Text>
                <Text className="text-base text-gray-800 leading-7">• アルコールにアレルギーがある方</Text>
              </View>
            </Card>
          </View>

          {/* アルコール依存症について */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              アルコール依存症のサイン
            </Text>
            <Card variant="outlined">
              <Text className="text-base text-gray-800 leading-7 mb-3">
                以下のような症状がある場合は、専門医への相談をお勧めします。
              </Text>
              <View className="space-y-2">
                <Text className="text-base text-gray-800 leading-7">• 飲酒量をコントロールできない</Text>
                <Text className="text-base text-gray-800 leading-7">• 飲酒のことで頭がいっぱいになる</Text>
                <Text className="text-base text-gray-800 leading-7">• 飲酒をやめると手が震える、汗をかく</Text>
                <Text className="text-base text-gray-800 leading-7">• 以前と同じ量では酔わなくなった</Text>
                <Text className="text-base text-gray-800 leading-7">• 飲酒が原因で仕事や人間関係に問題が生じている</Text>
                <Text className="text-base text-gray-800 leading-7">• 「やめよう」と思ってもやめられない</Text>
              </View>
            </Card>
          </View>

          {/* 相談窓口 */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              相談窓口
            </Text>
            <View className="space-y-3">
              <TouchableOpacity
                onPress={() => handleOpenLink('tel:0570-064-556')}
                className="bg-blue-50 border border-blue-300 rounded-lg p-4"
              >
                <Text className="font-bold text-blue-900 mb-1">
                  よりそいホットライン
                </Text>
                <Text className="text-blue-800">0570-064-556（24時間対応）</Text>
                <Text className="text-sm text-blue-700 mt-1">
                  様々な悩みに対応する総合相談窓口
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOpenLink('https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000188879.html')}
                className="bg-blue-50 border border-blue-300 rounded-lg p-4"
              >
                <Text className="font-bold text-blue-900 mb-1">
                  全国の精神保健福祉センター
                </Text>
                <Text className="text-blue-800">各都道府県に設置</Text>
                <Text className="text-sm text-blue-700 mt-1">
                  アルコール依存症に関する専門相談
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleOpenLink('https://www.aa-japan.org/')}
                className="bg-blue-50 border border-blue-300 rounded-lg p-4"
              >
                <Text className="font-bold text-blue-900 mb-1">
                  AA（アルコホーリクス・アノニマス）
                </Text>
                <Text className="text-sm text-blue-700">
                  アルコール依存症者の自助グループ
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 参考資料 */}
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4">
              参考資料
            </Text>
            <View className="space-y-2">
              <TouchableOpacity
                onPress={() => handleOpenLink('https://www.e-healthnet.mhlw.go.jp/information/alcohol')}
                className="flex-row items-center"
              >
                <Text className="text-primary-600 underline flex-1">
                  厚生労働省 e-ヘルスネット「アルコール」
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOpenLink('https://www.mhlw.go.jp/www1/topics/kenko21_11/b5.html')}
                className="flex-row items-center"
              >
                <Text className="text-primary-600 underline flex-1">
                  健康日本21（アルコール）
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 免責事項 */}
          <View className="bg-gray-100 rounded-lg p-4">
            <Text className="text-sm text-gray-600 leading-6">
              <Text className="font-bold">免責事項：</Text>本ガイドラインは一般的な情報提供を目的としており、医療上のアドバイスではありません。個人の健康状態に関する判断は、必ず医師等の専門家にご相談ください。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

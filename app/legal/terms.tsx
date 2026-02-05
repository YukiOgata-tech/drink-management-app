import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LEGAL_VERSIONS } from '@/types';

export default function TermsScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      {/* ヘッダー */}
      <View className="px-6 py-4 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-primary-600 text-base">戻る</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 flex-1">
          利用規約
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        <View className="space-y-6 pb-8">
          {/* バージョン情報 */}
          <View className="bg-gray-100 rounded-lg p-3">
            <Text className="text-sm text-gray-600">
              バージョン: {LEGAL_VERSIONS.TERMS} | 最終更新日: 2025年2月1日
            </Text>
          </View>

          {/* 前文 */}
          <View>
            <Text className="text-base text-gray-800 leading-7">
              本利用規約（以下「本規約」といいます）は、Alcohol Log & Event Hub（以下「本アプリ」といいます）の利用条件を定めるものです。利用者は、本規約に同意した上で本アプリをご利用ください。
            </Text>
          </View>

          {/* 第1条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第1条（定義）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 「本アプリ」とは、飲酒記録・管理・振り返りを目的としたモバイルアプリケーション「Alcohol Log & Event Hub」をいいます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 「利用者」とは、本規約に同意し、本アプリを利用する全ての方をいいます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 「イベント」とは、本アプリ内で作成される飲酒を伴う会合の記録単位をいいます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. 「コンテンツ」とは、利用者が本アプリに入力・投稿する全ての情報（飲酒記録、メモ、プロフィール情報等）をいいます。
              </Text>
            </View>
          </View>

          {/* 第2条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第2条（利用資格）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 本アプリは、日本国内において満20歳以上の方のみを対象としています。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 20歳未満の方による本アプリの利用は固くお断りいたします。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 利用者は、本アプリの利用にあたり、自身が満20歳以上であることを保証するものとします。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. 虚偽の年齢申告により本アプリを利用した場合、当該利用者は発生する全ての責任を負うものとします。
              </Text>
            </View>
          </View>

          {/* 第3条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第3条（本アプリの目的）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 本アプリは、飲酒を促進するものではありません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 本アプリの目的は、利用者自身の飲酒量の記録・可視化・振り返りを通じて、健康的な飲酒習慣の形成を支援することにあります。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 本アプリは医療機器ではなく、医療的診断や治療を目的としたものではありません。
              </Text>
            </View>
          </View>

          {/* 第4条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第4条（アカウント）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 利用者は、本アプリの一部機能を利用するためにアカウントを作成することができます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 利用者は、アカウント情報を適切に管理する義務を負い、第三者に使用させ、または譲渡・貸与してはなりません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. アカウントの不正使用によって生じた損害について、開発者は一切の責任を負いません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. 利用者は、ゲストモード（アカウント登録なし）でも本アプリの基本機能を利用できますが、データの同期やイベント機能は制限されます。
              </Text>
            </View>
          </View>

          {/* 第5条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第5条（禁止事項）
            </Text>
            <Text className="text-base text-gray-800 leading-7 mb-2">
              利用者は、本アプリの利用にあたり、以下の行為を行ってはなりません。
            </Text>
            <View className="ml-4 space-y-1">
              <Text className="text-base text-gray-800 leading-7">
                1. 法令または公序良俗に違反する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 20歳未満の者に飲酒を勧める、または飲酒を助長する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 飲酒運転を促進または助長する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. 虚偽の情報を登録または投稿する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                5. 他の利用者のプライバシーを侵害する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                6. 本アプリのシステムに不正にアクセスする行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                7. 本アプリの運営を妨害する行為
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                8. 本アプリを商業目的で利用する行為（開発者が認めた場合を除く）
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                9. その他、開発者が不適切と判断する行為
              </Text>
            </View>
          </View>

          {/* 第6条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第6条（コンテンツの取り扱い）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 利用者が本アプリに入力したコンテンツの著作権は、当該利用者に帰属します。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 開発者は、本アプリのサービス提供・改善のために、利用者のコンテンツを匿名化・統計化した上で分析に利用することがあります。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 利用者は、イベント機能を利用する際、当該イベントの参加者に対してコンテンツが共有されることに同意するものとします。
              </Text>
            </View>
          </View>

          {/* 第7条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第7条（免責事項）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 本アプリは「現状有姿」で提供されます。開発者は、本アプリの完全性、正確性、確実性、有用性等について、いかなる保証も行いません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 本アプリで表示される純アルコール量等の数値は推定値であり、実際の摂取量とは異なる場合があります。これらの数値を医療的判断の根拠としないでください。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 開発者は、本アプリの利用によって利用者に生じた損害（健康被害、事故、トラブル等を含みますがこれらに限られません）について、一切の責任を負いません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                4. 開発者は、本アプリのサービス中断、データの消失、外部サービスとの連携不具合等について、一切の責任を負いません。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                5. 利用者は、自己の責任において本アプリを利用し、飲酒に関する判断を行うものとします。
              </Text>
            </View>
          </View>

          {/* 第8条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第8条（飲酒に関する注意事項）
            </Text>
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <Text className="text-base text-red-800 leading-7">
                1. 20歳未満の者の飲酒は法律で禁止されています。
              </Text>
              <Text className="text-base text-red-800 leading-7">
                2. 飲酒運転は絶対にしないでください。
              </Text>
              <Text className="text-base text-red-800 leading-7">
                3. 妊娠中または妊娠の可能性がある方、授乳中の方は飲酒をお控えください。
              </Text>
              <Text className="text-base text-red-800 leading-7">
                4. 過度の飲酒は健康を害します。適正な飲酒量を心がけてください。
              </Text>
              <Text className="text-base text-red-800 leading-7">
                5. アルコール依存症が疑われる場合は、医療機関への相談を強くお勧めします。
              </Text>
            </View>
          </View>

          {/* 第9条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第9条（サービスの変更・終了）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 開発者は、利用者への事前通知なく、本アプリの内容を変更し、または提供を中止・終了することができます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. サービス終了の場合、開発者は合理的な期間を設けて利用者に通知するよう努めますが、これを保証するものではありません。
              </Text>
            </View>
          </View>

          {/* 第10条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第10条（利用者資格の停止・取消）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 開発者は、利用者が本規約に違反した場合、または本アプリの運営上必要と判断した場合、事前の通知なく当該利用者の利用資格を停止または取り消すことができます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 前項の措置によって利用者に損害が生じた場合でも、開発者は一切の責任を負いません。
              </Text>
            </View>
          </View>

          {/* 第11条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第11条（本規約の変更）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 開発者は、必要と判断した場合、利用者への事前通知なく本規約を変更することができます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 変更後の規約は、本アプリ内に掲示した時点から効力を生じます。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                3. 利用者が変更後に本アプリを利用した場合、変更後の規約に同意したものとみなします。
              </Text>
            </View>
          </View>

          {/* 第12条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第12条（準拠法・管轄裁判所）
            </Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-800 leading-7">
                1. 本規約の解釈および適用は、日本法に準拠するものとします。
              </Text>
              <Text className="text-base text-gray-800 leading-7">
                2. 本アプリに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </Text>
            </View>
          </View>

          {/* 第13条 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-3">
              第13条（分離可能性）
            </Text>
            <Text className="text-base text-gray-800 leading-7">
              本規約のいずれかの条項が無効または執行不能と判断された場合でも、その他の条項は引き続き有効に存続するものとします。
            </Text>
          </View>

          {/* 施行日 */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Text className="text-sm text-blue-800">
              本規約は2025年2月1日より施行します。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
